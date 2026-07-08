'use client'

import { useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { salvarAlteracoes } from '@/app/actions/calendario'
import type { Database } from '@/lib/supabase/database.types'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Edit2, Save, RotateCcw, Smartphone, Newspaper, ArrowUpDown, ArrowUp, ArrowDown, ImageOff } from 'lucide-react'
import { CalendarioKanban } from '@/components/calendario-kanban'

type Entrada = Database['public']['Tables']['entradas']['Row']

const plataformaIcone: Record<string, React.ReactNode> = {
  '🟣 Instagram Feed': <Smartphone className="h-4 w-4" />,
  '📱 Stories': <Smartphone className="h-4 w-4" />,
  '🔵 LinkedIn': <Newspaper className="h-4 w-4" />,
}

const statusCor = {
  planejado: 'bg-muted text-muted-foreground',
  alterado: 'bg-amber-100 text-amber-800',
  publicado: 'bg-emerald-100 text-emerald-800',
}

function normalizarImagens(imagens: unknown): string[] {
  if (imagens == null) return []
  if (Array.isArray(imagens)) {
    return imagens.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
  }
  if (typeof imagens === 'string') {
    const trimmed = imagens.trim()
    if (trimmed.length === 0) return []
    // PostgreSQL array literal: '{url1,url2}'
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1)
      if (inner.length === 0) return []
      return inner
        .split(',')
        .map((u) => u.trim().replace(/^"|"$/g, ''))
        .filter((u) => u.length > 0)
    }
    // JSON string: '["url1","url2"]'
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        }
      } catch {
        // ignora e tenta tratar como URL única
      }
    }
    return [trimmed]
  }
  return []
}

export function CalendarioCliente({
  entradas,
  calendarioId,
  isAdmin = false,
  viewMode = 'table',
}: {
  entradas: Entrada[]
  calendarioId: string
  isAdmin?: boolean
  viewMode?: 'table' | 'kanban'
}) {
  const [edicoes, setEdicoes] = useState<Record<string, Partial<Entrada>>>({})
  const [entradaAtiva, setEntradaAtiva] = useState<Entrada | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()

  const supabase = useMemo(() => createClient(), [])

  const valorAtivoImagens = (entrada: Entrada | null): string[] => {
    if (!entrada) return []
    return normalizarImagens(edicoes[entrada.id]?.imagens ?? entrada.imagens)
  }

  const removerImagem = (urlToRemove: string) => {
    if (!entradaAtiva) return
    const atuais = valorAtivoImagens(entradaAtiva)
    const novas = atuais.filter((url) => url !== urlToRemove)
    setEdicoes((prev) => ({
      ...prev,
      [entradaAtiva.id]: { ...prev[entradaAtiva.id], imagens: novas },
    }))
  }

  const handleUploadImagens = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !entradaAtiva) return

    setIsUploading(true)
    try {
      const novasUrls: string[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${calendarioId}/${entradaAtiva.id}_${Date.now()}_${i}.${fileExt}`

        const { error } = await supabase.storage
          .from('postagens')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          })

        if (error) {
          toast.error(`Erro ao enviar a imagem ${file.name}: ${error.message}`)
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('postagens')
            .getPublicUrl(fileName)
          novasUrls.push(publicUrl)
        }
      }

      if (novasUrls.length > 0) {
        const atuais = valorAtivoImagens(entradaAtiva)
        setEdicoes((prev) => ({
          ...prev,
          [entradaAtiva.id]: { 
            ...prev[entradaAtiva.id], 
            imagens: [...atuais, ...novasUrls] 
          },
        }))
        toast.success(`${novasUrls.length} imagem(ns) enviada(s) com sucesso!`)
      }
    } catch (err) {
      toast.error('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const [sortField, setSortField] = useState<keyof Entrada>('data_post')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: keyof Entrada) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const entradasOrdenadas = useMemo(() => {
    return [...entradas].sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]

      if (valA == null) return sortDirection === 'asc' ? 1 : -1
      if (valB == null) return sortDirection === 'asc' ? -1 : 1

      if (sortField === 'data_post') {
        const timeA = new Date(valA as string).getTime()
        const timeB = new Date(valB as string).getTime()
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA
      }

      if (sortField === 'numero') {
        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number)
      }

      if (sortField === 'imagens') {
        const lenA = (valA as string[] | undefined)?.length || 0
        const lenB = (valB as string[] | undefined)?.length || 0
        return sortDirection === 'asc' ? lenA - lenB : lenB - lenA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()

      if (strA < strB) return sortDirection === 'asc' ? -1 : 1
      if (strA > strB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [entradas, sortField, sortDirection])

  const alteracoesPendentes = useMemo(() => {
    return Object.entries(edicoes).filter(([id, campos]) => {
      const original = entradas.find((e) => e.id === id)
      if (!original) return false
      return Object.entries(campos).some(([chave, valor]) => original[chave as keyof Entrada] !== valor)
    })
  }, [edicoes, entradas])

  const handleSalvar = () => {
    const payload = alteracoesPendentes.map(([id, campos]) => ({ id, campos }))

    startTransition(async () => {
      const result = await salvarAlteracoes(payload)
      if (result.error) {
        toast.error(result.error)
      } else {
        setEdicoes({})
        setEntradaAtiva(null)
        router.refresh()
        toast.success(`${result.salvas} alteração(ões) salva(s)`)
      }
    })
  }

  const handleReset = () => {
    if (confirm('Descartar todas as alterações não salvas?')) {
      setEdicoes({})
    }
  }

  const abrirEdicao = (entrada: Entrada | { id: string; numero: number; tema: string | null; data_post: string; plataforma: string | null; status: string; imagens: string[] | null }) => {
    setEntradaAtiva(entrada as Entrada)
  }

  const alterarAtiva = (campo: keyof Entrada, valor: string) => {
    if (!entradaAtiva) return
    setEdicoes((prev) => ({
      ...prev,
      [entradaAtiva.id]: { ...prev[entradaAtiva.id], [campo]: valor },
    }))
  }

  const valorAtivo = (entrada: Entrada | null, campo: keyof Entrada) => {
    if (!entrada) return ''
    return (edicoes[entrada.id]?.[campo] as string) ?? (entrada[campo] as string) ?? ''
  }

  return (
    <div className="space-y-4">
      {alteracoesPendentes.length > 0 && (
        <div className="sticky top-0 z-20 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900">
            Você tem {alteracoesPendentes.length} alteração(ões) não salva(s).
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Descartar
            </Button>
            <Button size="sm" onClick={handleSalvar} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
      )}

      {viewMode === 'kanban' ? (
        <div className="rounded-xl border bg-card shadow-sm p-4">
          <CalendarioKanban entradas={entradas} onCardClick={abrirEdicao} />
        </div>
      ) : (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead 
                  className="w-16 cursor-pointer hover:bg-accent/50 select-none transition-colors"
                  onClick={() => handleSort('numero')}
                >
                  <span className="flex items-center gap-1">
                    Nº
                    {sortField === 'numero' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/35" />
                    )}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50 select-none transition-colors"
                  onClick={() => handleSort('data_post')}
                >
                  <span className="flex items-center gap-1">
                    Data
                    {sortField === 'data_post' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/35" />
                    )}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50 select-none transition-colors"
                  onClick={() => handleSort('plataforma')}
                >
                  <span className="flex items-center gap-1">
                    Plataforma
                    {sortField === 'plataforma' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/35" />
                    )}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50 select-none transition-colors"
                  onClick={() => handleSort('tema')}
                >
                  <span className="flex items-center gap-1">
                    Tema
                    {sortField === 'tema' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/35" />
                    )}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50 select-none transition-colors"
                  onClick={() => handleSort('formato')}
                >
                  <span className="flex items-center gap-1">
                    Formato
                    {sortField === 'formato' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/35" />
                    )}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50 select-none transition-colors"
                  onClick={() => handleSort('imagens')}
                >
                  <span className="flex items-center gap-1">
                    Imagens
                    {sortField === 'imagens' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/35" />
                    )}
                  </span>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-accent/50 select-none transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <span className="flex items-center gap-1">
                    Status
                    {sortField === 'status' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground/35" />
                    )}
                  </span>
                </TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entradasOrdenadas.map((entrada) => {
                const editada = Object.keys(edicoes[entrada.id] || {}).length > 0
                return (
                  <TableRow key={entrada.id} className={editada ? 'bg-amber-50/50' : undefined}>
                    <TableCell className="font-medium">{entrada.numero}</TableCell>
                    <TableCell>
                      {format(parseISO(entrada.data_post), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        {plataformaIcone[entrada.plataforma || ''] || null}
                        {entrada.plataforma?.replace(/^[^\s]+\s/, '')}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{entrada.tema}</TableCell>
                    <TableCell>{entrada.formato}</TableCell>
                    <TableCell>
                      <ImagensCell
                        imagens={edicoes[entrada.id]?.imagens ?? entrada.imagens}
                        comAlteracao={editada}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge className={statusCor[entrada.status]} variant="secondary">
                        {entrada.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(entrada)}>
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Editar entrada {entrada.numero}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
      )}

      <Dialog open={!!entradaAtiva} onOpenChange={(open) => !open && setEntradaAtiva(null)}>
        <DialogContent className="max-w-4xl md:max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar postagem #{entradaAtiva?.numero}</DialogTitle>
          </DialogHeader>

          {entradaAtiva && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_post">Data</Label>
                  <Input
                    id="data_post"
                    type="date"
                    value={valorAtivo(entradaAtiva, 'data_post')}
                    onChange={(e) => alterarAtiva('data_post', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plataforma">Plataforma</Label>
                  <Input
                    id="plataforma"
                    value={valorAtivo(entradaAtiva, 'plataforma')}
                    onChange={(e) => alterarAtiva('plataforma', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pilar">Pilar</Label>
                  <Input
                    id="pilar"
                    value={valorAtivo(entradaAtiva, 'pilar')}
                    onChange={(e) => alterarAtiva('pilar', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formato">Formato</Label>
                  <Input
                    id="formato"
                    value={valorAtivo(entradaAtiva, 'formato')}
                    onChange={(e) => alterarAtiva('formato', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tema">Tema</Label>
                <Textarea
                  id="tema"
                  rows={2}
                  value={valorAtivo(entradaAtiva, 'tema')}
                  onChange={(e) => alterarAtiva('tema', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo</Label>
                <Input
                  id="objetivo"
                  value={valorAtivo(entradaAtiva, 'objetivo')}
                  onChange={(e) => alterarAtiva('objetivo', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gancho">Gancho</Label>
                <Textarea
                  id="gancho"
                  rows={3}
                  value={valorAtivo(entradaAtiva, 'gancho')}
                  onChange={(e) => alterarAtiva('gancho', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legenda">Legenda completa</Label>
                <Textarea
                  id="legenda"
                  rows={6}
                  value={valorAtivo(entradaAtiva, 'legenda')}
                  onChange={(e) => alterarAtiva('legenda', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cta">CTA</Label>
                  <Textarea
                    id="cta"
                    rows={2}
                    value={valorAtivo(entradaAtiva, 'cta')}
                    onChange={(e) => alterarAtiva('cta', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compliance">Compliance</Label>
                  <Textarea
                    id="compliance"
                    rows={2}
                    value={valorAtivo(entradaAtiva, 'compliance')}
                    onChange={(e) => alterarAtiva('compliance', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Imagens da Postagem (Carrossel / Galeria)</Label>

                {/* Lista de Imagens Carregadas */}
                {valorAtivoImagens(entradaAtiva).length > 0 && (
                  <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/40 p-3 overflow-x-auto">
                    {valorAtivoImagens(entradaAtiva).map((url, index) => (
                      <DialogImage
                        key={url}
                        url={url}
                        index={index}
                        onRemove={() => removerImagem(url)}
                      />
                    ))}
                  </div>
                )}

                {/* Seletor de Arquivos */}
                <div className="flex flex-col gap-2">
                  <Input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    multiple
                    onChange={handleUploadImagens}
                    disabled={isUploading}
                  />
                  {isUploading && (
                    <p className="text-xs text-muted-foreground animate-pulse">
                      Enviando imagem(ns)...
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Você pode selecionar várias imagens de uma vez para criar um carrossel (PNG ou JPG).
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status da publicação</Label>
                  <select
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={valorAtivo(entradaAtiva, 'status')}
                    onChange={(e) => alterarAtiva('status', e.target.value)}
                  >
                    <option value="planejado">Planejado</option>
                    <option value="alterado">Alterado</option>
                    <option value="publicado">Publicado</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntradaAtiva(null)}>
              Fechar
            </Button>
            <Button onClick={handleSalvar} disabled={isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ImagensCell({
  imagens,
  comAlteracao = false,
}: {
  imagens: string[] | null | undefined
  comAlteracao?: boolean
}) {
  const [imgError, setImgError] = useState(false)

  const lista = useMemo(
    () =>
      Array.isArray(imagens)
        ? imagens.filter((u): u is string => typeof u === 'string' && u.length > 0)
        : [],
    [imagens]
  )

  const total = lista.length
  const capa = lista[0]
  const [capaAnterior, setCapaAnterior] = useState(capa)
  if (capaAnterior !== capa) {
    setCapaAnterior(capa)
    setImgError(false)
  }

  const mostrarImagem = total > 0 && !!capa && !imgError

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-8 w-8 shrink-0">
        {mostrarImagem ? (
          <img
            src={capa}
            alt={`Capa da postagem (${total} ${total === 1 ? 'imagem' : 'imagens'})`}
            className="h-8 w-8 rounded object-cover border bg-muted"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded border border-dashed bg-muted/40 text-muted-foreground/50"
            title={total > 0 ? 'Imagem indisponível' : 'Sem imagens'}
          >
            <ImageOff className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
      </div>
      <span
        className={`text-xs font-medium tabular-nums ${
          total === 0 ? 'text-muted-foreground/50' : 'text-foreground'
        }`}
        aria-label={`${total} ${total === 1 ? 'imagem' : 'imagens'}`}
      >
        {total}
      </span>
      {comAlteracao && (
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
          title="Alteração não salva"
          aria-label="Alteração não salva"
        />
      )}
    </div>
  )
}

function DialogImage({
  url,
  index,
  onRemove,
}: {
  url: string
  index: number
  onRemove: () => void
}) {
  const [error, setError] = useState(false)

  return (
    <div className="relative aspect-square w-[540px] max-w-full shrink-0 overflow-hidden rounded-md border bg-background">
      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/40 p-2 text-muted-foreground/60">
          <ImageOff className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] text-center leading-tight">Indisponível</span>
        </div>
      ) : (
        <img
          src={url}
          alt={`Imagem ${index + 1}`}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        Remover
      </button>
      <span className="absolute top-1 left-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {index + 1}
      </span>
    </div>
  )
}
