'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import * as XLSX from 'xlsx'
import type { AdminUserAttributes } from '@supabase/supabase-js'

const COLUNAS_OBRIGATORIAS = [
  'Nº',
  'Data',
  'Plataforma',
  'Pilar',
  'Tema',
  'Objetivo',
  'Formato',
  'Gancho',
  'Legenda Completa',
  'CTA',
  'Compliance',
]

function formatDate(value: string | Date | number | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      const y = date.y
      const m = String(date.m).padStart(2, '0')
      const d = String(date.d).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  if (typeof value === 'string') {
    const [d, m, y] = value.split('/')
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0]
  }
  return null
}

export async function criarCliente(
  prevState: unknown,
  formData: FormData
) {
  await requireAdmin()
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  const nome = String(formData.get('nome') || '').trim()
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const nomeUsuario = String(formData.get('nome_usuario') || '').trim()
  const senha = String(formData.get('senha') || '')

  if (!nome || !email || !nomeUsuario || !senha) {
    return { error: 'Preencha todos os campos.' }
  }

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .insert({ nome })
    .select('id')
    .single()

  if (clienteError || !cliente) {
    return { error: 'Erro ao criar cliente: ' + (clienteError?.message || '') }
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      nome: nomeUsuario,
      papel: 'cliente',
      cliente_id: cliente.id,
    },
  })

  if (authError || !authUser.user) {
    await supabase.from('clientes').delete().eq('id', cliente.id)
    return { error: 'Erro ao criar usuário: ' + (authError?.message || '') }
  }

  const { error: calError } = await supabase
    .from('calendarios')
    .insert({ cliente_id: cliente.id, titulo: `Calendário ${nome}` })

  if (calError) {
    return { error: 'Cliente criado, mas erro ao criar calendário: ' + calError.message }
  }

  revalidatePath('/admin')
  return { success: true, message: 'Cliente e usuário criados.' }
}

export type UsuarioComCliente = {
  id: string
  nome: string
  email: string
  papel: 'admin' | 'cliente'
  cliente_id: string | null
  ativo: boolean
  created_at: string
  clientes: { nome: string } | null
}

export type AlteracaoComDetalhes = {
  id: string
  entrada_id: string
  usuario_id: string
  diff: Record<string, { de: unknown; para: unknown }>
  criado_em: string
  entradas: { numero: number; tema: string | null; data_post: string; calendario_id: string } | null
  usuarios: { nome: string; email: string; clientes: { nome: string } | null } | null
}

export async function listarUsuarios(): Promise<UsuarioComCliente[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('usuarios')
    .select('*, clientes(nome)')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error('Erro ao listar usuários: ' + error.message)
  }

  return (data || []) as unknown as UsuarioComCliente[]
}

export type ClienteSimples = {
  id: string
  nome: string
}

export async function listarClientes(): Promise<ClienteSimples[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nome')
    .order('nome', { ascending: true })

  if (error) {
    throw new Error('Erro ao listar clientes: ' + error.message)
  }

  return (data || []) as unknown as ClienteSimples[]
}

export async function listarAlteracoes(): Promise<AlteracaoComDetalhes[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('alteracoes')
    .select('*, entradas(numero, tema, data_post, calendario_id), usuarios(nome, email, clientes(nome))')
    .order('criado_em', { ascending: false })
    .limit(200)

  if (error) {
    throw new Error('Erro ao listar alterações: ' + error.message)
  }

  return (data || []) as unknown as AlteracaoComDetalhes[]
}

export type AlteracoesPaginadas = {
  data: AlteracaoComDetalhes[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

const PAGE_SIZE_PADRAO = 20

export async function listarAlteracoesPaginadas(
  page: number = 1,
  pageSize: number = PAGE_SIZE_PADRAO
): Promise<AlteracoesPaginadas> {
  await requireAdmin()
  const supabase = await createClient()

  const paginaAtual = Math.max(1, Math.floor(page))
  const tamanho = Math.max(1, Math.min(100, Math.floor(pageSize)))
  const inicio = (paginaAtual - 1) * tamanho
  const fim = inicio + tamanho - 1

  const { data, error, count } = await supabase
    .from('alteracoes')
    .select('*, entradas(numero, tema, data_post, calendario_id), usuarios(nome, email, clientes(nome))', { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(inicio, fim)

  if (error) {
    throw new Error('Erro ao listar alterações: ' + error.message)
  }

  const totalCount = count ?? 0
  const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / tamanho)

  return {
    data: (data || []) as unknown as AlteracaoComDetalhes[],
    totalCount,
    page: paginaAtual,
    pageSize: tamanho,
    totalPages,
  }
}

export async function alternarUsuario(id: string, ativo: boolean) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase.from('usuarios').update({ ativo }).eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function importarCalendario(
  clienteId: string,
  workbookBuffer: ArrayBuffer
): Promise<{ success: boolean; mensagem?: string; erros?: string[]; importados?: number }> {
  await requireAdmin()
  const supabase = await createClient()

  const workbook = XLSX.read(new Uint8Array(workbookBuffer), { type: 'array' })
  const sheet = workbook.Sheets['Calendário'] || workbook.Sheets[workbook.SheetNames[0]]

  if (!sheet) {
    return { success: false, erros: ['Planilha não encontrada.'] }
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })

  // Encontra cabeçalho
  let headerIndex = -1
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (Array.isArray(row) && row.includes('Nº')) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    return { success: false, erros: ['Cabeçalho não encontrado. A planilha precisa ter a coluna Nº.'] }
  }

  const headers = rows[headerIndex].map((h) => String(h).trim())
  const missing = COLUNAS_OBRIGATORIAS.filter((c) => !headers.includes(c))
  if (missing.length > 0) {
    return { success: false, erros: [`Colunas obrigatórias faltando: ${missing.join(', ')}`] }
  }

  const { data: calendario, error: calError } = await supabase
    .from('calendarios')
    .select('id')
    .eq('cliente_id', clienteId)
    .single()

  if (calError || !calendario) {
    return { success: false, erros: ['Calendário do cliente não encontrado.'] }
  }

  const dataRows = rows.slice(headerIndex + 1)
  const entradas = []
  const erros: string[] = []

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    if (!Array.isArray(row) || row.every((c) => c === '' || c == null)) continue

    const get = (name: string): unknown => {
      const idx = headers.indexOf(name)
      return idx >= 0 ? row[idx] : undefined
    }

    const numero = Number(get('Nº'))
    const dataPost = formatDate(get('Data') as string | number | Date | undefined)

    if (!numero || isNaN(numero)) {
      erros.push(`Linha ${headerIndex + i + 2}: Nº inválido.`)
      continue
    }
    if (!dataPost) {
      erros.push(`Linha ${headerIndex + i + 2}: Data inválida.`)
      continue
    }

    entradas.push({
      calendario_id: calendario.id,
      numero,
      data_post: dataPost,
      hora_prevista: '12:00:00',
      plataforma: String(get('Plataforma') || '').trim() || null,
      pilar: String(get('Pilar') || '').trim() || null,
      tema: String(get('Tema') || '').trim() || null,
      objetivo: String(get('Objetivo') || '').trim() || null,
      formato: String(get('Formato') || '').trim() || null,
      gancho: String(get('Gancho') || '').trim() || null,
      legenda: String(get('Legenda Completa') || '').trim() || null,
      cta: String(get('CTA') || '').trim() || null,
      compliance: String(get('Compliance') || '').trim() || null,
      status: 'planejado' as const,
    })
  }

  if (erros.length > 0) {
    return { success: false, erros }
  }

  if (entradas.length === 0) {
    return { success: false, erros: ['Nenhuma entrada válida encontrada.'] }
  }

  const { error: insertError } = await supabase.from('entradas').insert(entradas)

  if (insertError) {
    return { success: false, erros: ['Erro ao importar: ' + insertError.message] }
  }

  revalidatePath('/admin')
  revalidatePath('/cliente')

  return { success: true, importados: entradas.length }
}

export async function editarUsuarioECliente(
  userId: string,
  clienteId: string | null,
  dados: {
    nomeUsuario: string
    email: string
    nomeCliente?: string
    senha?: string
  }
) {
  await requireAdmin()
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  // 1. Atualiza auth user (email, password se fornecida)
  const updateData: AdminUserAttributes = {
    email: dados.email.trim().toLowerCase(),
    user_metadata: {
      nome: dados.nomeUsuario.trim(),
    }
  }

  if (dados.senha && dados.senha.trim().length > 0) {
    updateData.password = dados.senha.trim()
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)
  if (authError) {
    return { error: 'Erro ao atualizar dados de autenticação: ' + authError.message }
  }

  // 2. Atualiza public.usuarios
  const { error: userError } = await supabase
    .from('usuarios')
    .update({
      nome: dados.nomeUsuario.trim(),
      email: dados.email.trim().toLowerCase()
    })
    .eq('id', userId)

  if (userError) {
    return { error: 'Erro ao atualizar perfil do usuário: ' + userError.message }
  }

  // 3. Se for cliente, atualiza public.clientes e public.calendarios
  if (clienteId && dados.nomeCliente) {
    const nomeClienteTrim = dados.nomeCliente.trim()
    const { error: clienteError } = await supabase
      .from('clientes')
      .update({ nome: nomeClienteTrim })
      .eq('id', clienteId)

    if (clienteError) {
      return { error: 'Erro ao atualizar nome do cliente: ' + clienteError.message }
    }

    // Atualiza título do calendário
    await supabase
      .from('calendarios')
      .update({ titulo: `Calendário ${nomeClienteTrim}` })
      .eq('cliente_id', clienteId)
  }

  revalidatePath('/admin')
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function excluirUsuarioECliente(userId: string, clienteId: string | null) {
  await requireAdmin()
  const supabase = await createClient()
  const supabaseAdmin = await createAdminClient()

  // 1. Exclui o usuário do auth.users (cascateia para public.usuarios)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) {
    return { error: 'Erro ao excluir usuário: ' + authError.message }
  }

  // 2. Se for cliente, exclui o cliente do public.clientes (cascateia para calendarios e entradas)
  if (clienteId) {
    const { error: clienteError } = await supabase.from('clientes').delete().eq('id', clienteId)
    if (clienteError) {
      return { error: 'Erro ao excluir cliente: ' + clienteError.message }
    }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/usuarios')
  return { success: true }
}

