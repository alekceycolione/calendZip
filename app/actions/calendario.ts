'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getProfile, requireCliente, requireAdmin } from '@/lib/auth'
import { extrairPathStorage } from '@/lib/utils-storage'
import type { Database } from '@/lib/supabase/database.types'
import type { AlteracaoComDetalhes } from '@/app/actions/admin'

type Entrada = Database['public']['Tables']['entradas']['Row']

type AlteracaoPayload = {
  id: string
  campos: Partial<Entrada>
}

export async function getCalendarioDoCliente(): Promise<CalendarioComEntradas> {
  const { profile } = await requireCliente()
  const supabase = await createClient()

  const { data: calendario, error } = await supabase
    .from('calendarios')
    .select('*, entradas(*)')
    .eq('cliente_id', profile.cliente_id!)
    .single()

  if (error || !calendario) {
    throw new Error('Calendário não encontrado.')
  }

  return calendario as unknown as CalendarioComEntradas
}

export type CalendarioComEntradas = {
  id: string
  cliente_id: string
  titulo: string
  created_at: string
  entradas: Entrada[]
  clientes: { nome: string } | null
}

export async function getCalendarioAdmin(): Promise<CalendarioComEntradas[]>
export async function getCalendarioAdmin(calendarioId: string): Promise<CalendarioComEntradas>
export async function getCalendarioAdmin(calendarioId?: string): Promise<CalendarioComEntradas | CalendarioComEntradas[]> {
  await requireAdmin()
  const supabase = await createClient()

  if (calendarioId) {
    const { data, error } = await supabase
      .from('calendarios')
      .select('*, clientes(nome), entradas(*)')
      .eq('id', calendarioId)
      .single()

    if (error || !data) {
      throw new Error('Erro ao buscar calendário.')
    }

    return data as unknown as CalendarioComEntradas
  }

  const { data, error } = await supabase
    .from('calendarios')
    .select('*, clientes(nome), entradas(*)')

  if (error) {
    throw new Error('Erro ao buscar calendários.')
  }

  return (data || []) as unknown as CalendarioComEntradas[]
}

export async function salvarAlteracoes(alteracoes: AlteracaoPayload[]) {
  const { user, profile } = await getProfile()
  const supabase = await createClient()

  if (!alteracoes.length) {
    return { error: 'Nenhuma alteração para salvar.' }
  }

  // Busca entradas atuais para diff
  const ids = alteracoes.map((a) => a.id)
  const { data: entradasAtuais, error: fetchError } = await supabase
    .from('entradas')
    .select('*')
    .in('id', ids)

  if (fetchError || !entradasAtuais) {
    return { error: 'Erro ao carregar entradas para comparação.' }
  }

  const mapaAtuais = new Map(entradasAtuais.map((e) => [e.id, e]))

  // Validação básica
  for (const alt of alteracoes) {
    const atual = mapaAtuais.get(alt.id)
    if (!atual) {
      return { error: `Entrada ${alt.id} não encontrada.` }
    }
    if (profile.papel === 'cliente' && alt.campos.status) {
      return { error: 'Cliente não pode alterar status.' }
    }
  }

  // Prepara updates com updated_at
  const updates = alteracoes.map((alt) => {
    const atual = mapaAtuais.get(alt.id)!
    const novoStatus = profile.papel === 'admin'
      ? alt.campos.status || atual.status
      : alt.campos.status || (atual.status === 'publicado' ? 'alterado' : 'alterado')

    return {
      id: alt.id,
      calendario_id: atual.calendario_id,
      numero: alt.campos.numero ?? atual.numero,
      data_post: alt.campos.data_post ?? atual.data_post,
      hora_prevista: alt.campos.hora_prevista ?? atual.hora_prevista,
      plataforma: alt.campos.plataforma ?? atual.plataforma,
      pilar: alt.campos.pilar ?? atual.pilar,
      tema: alt.campos.tema ?? atual.tema,
      objetivo: alt.campos.objetivo ?? atual.objetivo,
      formato: alt.campos.formato ?? atual.formato,
      gancho: alt.campos.gancho ?? atual.gancho,
      legenda: alt.campos.legenda ?? atual.legenda,
      cta: alt.campos.cta ?? atual.cta,
      compliance: alt.campos.compliance ?? atual.compliance,
      status: novoStatus,
      imagens: alt.campos.imagens ?? atual.imagens,
      updated_at: new Date().toISOString(),
    }
  })

  const { error: updateError } = await supabase.from('entradas').upsert(updates)

  if (updateError) {
    return { error: 'Erro ao salvar alterações: ' + updateError.message }
  }

  // Limpeza de imagens removidas: se o usuário removeu uma imagem pelo
  // dialog, o array no DB foi atualizado mas o arquivo ainda está no bucket.
  // Calculamos o diff de URLs (antigas que não estão nas novas) e apagamos
  // do Storage via service_role. Operação best-effort: se falhar, o save
  // já foi feito e os arquivos serão limpos depois pelo script
  // scripts/cleanup-orphan-images.js.
  const arquivosParaRemover: string[] = []
  for (const alt of alteracoes) {
    if (alt.campos.imagens === undefined) continue
    const atual = mapaAtuais.get(alt.id)
    if (!atual) continue
    const atuaisArr: string[] = Array.isArray(atual.imagens) ? atual.imagens : []
    const novasArr: string[] = Array.isArray(alt.campos.imagens) ? alt.campos.imagens : []
    const conjuntoNovas = new Set(novasArr)
    for (const url of atuaisArr) {
      if (typeof url === 'string' && url.length > 0 && !conjuntoNovas.has(url)) {
        arquivosParaRemover.push(url)
      }
    }
  }

  if (arquivosParaRemover.length > 0) {
    const supabaseAdmin = await createAdminClient()
    const paths = arquivosParaRemover
      .map(extrairPathStorage)
      .filter((p): p is string => p !== null)

    if (paths.length > 0) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('postagens')
        .remove(paths)

      if (storageError) {
        console.error(
          '[salvarAlteracoes] Falha ao remover do Storage (best-effort):',
          storageError.message
        )
      }
    }
  }

  // Registra alterações e notificações
  const alteracoesInserir = []
  const notificacoesInserir = []

  for (const alt of alteracoes) {
    const atual = mapaAtuais.get(alt.id)!
    const diff: Record<string, { de: unknown; para: unknown }> = {}

    for (const [chave, valor] of Object.entries(alt.campos)) {
      const de = atual[chave as keyof Entrada]
      if (de !== valor) {
        diff[chave] = { de, para: valor }
      }
    }

    if (Object.keys(diff).length === 0) continue

    alteracoesInserir.push({
      entrada_id: alt.id,
      usuario_id: user.id,
      diff,
    })
  }

  if (alteracoesInserir.length > 0) {
    const supabaseAdmin = await createAdminClient()
    const { data: alteracoesSalvas, error: alteracaoError } = await supabaseAdmin
      .from('alteracoes')
      .insert(alteracoesInserir)
      .select('id')

    if (alteracaoError) {
      return { error: 'Erro ao registrar histórico: ' + alteracaoError.message }
    }

    for (const alt of alteracoesSalvas || []) {
      notificacoesInserir.push({
        alteracao_id: alt.id,
        canal: 'email',
        estado: 'pendente' as const,
      })
    }

    if (notificacoesInserir.length > 0) {
      await supabaseAdmin.from('notificacoes').insert(notificacoesInserir)
    }
  }

  revalidatePath('/cliente')
  revalidatePath('/admin')

  return { success: true, salvas: alteracoesInserir.length }
}

export async function marcarPublicado(entradaId: string, publicado: boolean) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('entradas')
    .update({ status: publicado ? 'publicado' : 'planejado' })
    .eq('id', entradaId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

function isValidDateStr(s: unknown): s is string {
  if (typeof s !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00`)
  return !Number.isNaN(d.getTime())
}

function isValidTimeStr(s: unknown): s is string {
  if (typeof s !== 'string') return false
  return /^\d{2}:\d{2}(:\d{2})?$/.test(s)
}

export async function reagendarEntrada(
  entradaId: string,
  novaData: string,
  novaHora?: string
): Promise<{ ok: true } | { error: string }> {
  const { profile } = await getProfile()
  if (!profile.ativo) {
    return { error: 'Usuário inativo.' }
  }
  if (!isValidDateStr(novaData)) {
    return { error: 'Data inválida. Use YYYY-MM-DD.' }
  }
  if (novaHora !== undefined && !isValidTimeStr(novaHora)) {
    return { error: 'Hora inválida. Use HH:MM ou HH:MM:SS.' }
  }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  if (new Date(`${novaData}T00:00:00`) < hoje) {
    return { error: 'Não é possível reagendar para uma data no passado.' }
  }

  const supabase = await createClient()

  const { data: entrada, error: entradaErr } = await supabase
    .from('entradas')
    .select('id, data_post, hora_prevista, calendario_id, calendarios(cliente_id)')
    .eq('id', entradaId)
    .single()

  if (entradaErr || !entrada) {
    return { error: 'Entrada não encontrada.' }
  }

  const horaFinal = novaHora ?? entrada.hora_prevista
  const dataMudou = entrada.data_post !== novaData
  const horaMudou = novaHora !== undefined && entrada.hora_prevista !== novaHora

  if (!dataMudou && !horaMudou) {
    return { ok: true }
  }

  const updates: { data_post?: string; hora_prevista?: string } = {}
  if (dataMudou) updates.data_post = novaData
  if (horaMudou) updates.hora_prevista = horaFinal

  const { error: updateErr } = await supabase
    .from('entradas')
    .update(updates)
    .eq('id', entradaId)

  if (updateErr) {
    return { error: 'Erro ao reagendar: ' + updateErr.message }
  }

  const diff: Record<string, { de: unknown; para: unknown }> = {}
  if (dataMudou) diff.data_post = { de: entrada.data_post, para: novaData }
  if (horaMudou) diff.hora_prevista = { de: entrada.hora_prevista, para: horaFinal }

  if (Object.keys(diff).length > 0) {
    await supabase.from('alteracoes').insert({
      entrada_id: entradaId,
      usuario_id: profile.id,
      diff,
    })
  }

  revalidatePath('/admin/calendarios')
  revalidatePath('/cliente/calendario')
  return { ok: true }
}

export async function listarAlteracoesDoCalendario(calendarioId: string): Promise<AlteracaoComDetalhes[]> {
  await getProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alteracoes')
    .select('*, entradas!inner(numero, tema, data_post, calendario_id), usuarios(nome, email)')
    .eq('entradas.calendario_id', calendarioId)
    .order('criado_em', { ascending: false })
    .limit(10)

  if (error) {
    throw new Error('Erro ao buscar histórico do calendário: ' + error.message)
  }

  return (data || []) as unknown as AlteracaoComDetalhes[]
}
