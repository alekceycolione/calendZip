'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageDown, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { setSelectedClienteClient } from '@/lib/utils-cliente'

type Entrada = {
  id: string
  numero: number
  tema: string | null
  imagens: string[]
}

type Calendario = {
  id: string
  titulo: string
  clientes: { nome: string } | null
  entradas: Entrada[]
}

export function ExportarImagensClient({
  calendarios,
  defaultClienteId,
}: {
  calendarios: Calendario[]
  defaultClienteId?: string
}) {
  const [selectedClienteId, setSelectedClienteId] = useState(
    defaultClienteId || calendarios[0]?.id || ''
  )
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const selectedCalendario = calendarios.find((c) => c.id === selectedClienteId)
  const selectedLabel =
    selectedCalendario?.clientes?.nome || selectedCalendario?.titulo || ''

  const entradasOrdenadas = useMemo(
    () =>
      [...(selectedCalendario?.entradas ?? [])].sort((a, b) => a.numero - b.numero),
    [selectedCalendario]
  )

  const allUrls = useMemo(
    () => entradasOrdenadas.flatMap((e) => e.imagens ?? []),
    [entradasOrdenadas]
  )
  const totalSelecionadas = selectedUrls.size
  const allSelected = allUrls.length > 0 && totalSelecionadas === allUrls.length

  const handleClienteChange = (id: string | null) => {
    if (!id) return
    setSelectedClienteId(id)
    setSelectedClienteClient(id)
    setSelectedUrls(new Set())
  }

  const toggleUrl = (url: string) => {
    setSelectedUrls((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelectedUrls(new Set())
    else setSelectedUrls(new Set(allUrls))
  }

  const handleExport = async () => {
    if (totalSelecionadas === 0) {
      toast.error('Selecione pelo menos uma imagem')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/calendario/export-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: Array.from(selectedUrls) }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Erro ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') || ''
      a.download = disposition.match(/filename="?([^"]+)"?/)?.[1] || 'imagens.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Download iniciado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar')
    } finally {
      setIsLoading(false)
    }
  }

  if (calendarios.length === 0) {
    return <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border bg-card p-4 max-w-md">
        <label htmlFor="cliente" className="text-sm font-medium whitespace-nowrap">
          Cliente:
        </label>
        <Select value={selectedClienteId} onValueChange={handleClienteChange}>
          <SelectTrigger id="cliente" className="w-full">
            <SelectValue placeholder="Selecione um cliente">
              {selectedLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {calendarios.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.clientes?.nome || c.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCalendario && (
        <div className="border-b pb-4">
          <h2 className="text-xl font-medium text-foreground">
            {selectedCalendario.titulo}
          </h2>
          <p className="text-sm text-muted-foreground">
            Proprietário: {selectedCalendario.clientes?.nome || 'N/A'}
          </p>
        </div>
      )}

      <div className="sticky top-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-background p-3 shadow-sm">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{totalSelecionadas}</span> de{' '}
          {allUrls.length} imagens selecionadas
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={allUrls.length === 0}>
            {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading || totalSelecionadas === 0}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImageDown className="h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? 'Exportando...' : 'Exportar selecionadas'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {entradasOrdenadas.length === 0 && (
          <p className="text-muted-foreground text-sm">Este calendário não tem entradas.</p>
        )}
        {entradasOrdenadas.map((ent) => {
          if (!ent.imagens || ent.imagens.length === 0) return null
          return (
            <div key={ent.id} className="rounded-lg border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  #{ent.numero} {ent.tema || '(sem tema)'}
                </h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {ent.imagens.length} {ent.imagens.length === 1 ? 'imagem' : 'imagens'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ent.imagens.map((url) => {
                  const isChecked = selectedUrls.has(url)
                  return (
                    <label
                      key={url}
                      className={cn(
                        'group relative aspect-square w-[540px] max-w-full cursor-pointer overflow-hidden rounded-md border-2 bg-muted transition-colors',
                        isChecked ? 'border-primary' : 'border-transparent hover:border-muted-foreground/40'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUrl(url)}
                        aria-label={`Selecionar imagem da entrada #${ent.numero}`}
                        className="sr-only"
                      />
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {isChecked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/25">
                          <div className="rounded-full bg-primary p-1.5 text-primary-foreground shadow">
                            <Check className="h-4 w-4" aria-hidden="true" />
                          </div>
                        </div>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
