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
import { FileSpreadsheet, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { setSelectedClienteClient } from '@/lib/utils-cliente'

type Entrada = {
  id: string
  numero: number
  tema: string | null
  data_post: string
  plataforma: string | null
  status: string
  imagens: string[]
}

type Calendario = {
  id: string
  titulo: string
  clientes: { nome: string } | null
  entradas: Entrada[]
}

export function ExportarXlsxClient({
  calendarios,
  defaultClienteId,
}: {
  calendarios: Calendario[]
  defaultClienteId?: string
}) {
  const [selectedClienteId, setSelectedClienteId] = useState(
    defaultClienteId || calendarios[0]?.id || ''
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const selectedCalendario = calendarios.find((c) => c.id === selectedClienteId)
  const selectedLabel =
    selectedCalendario?.clientes?.nome || selectedCalendario?.titulo || ''

  const entradasOrdenadas = useMemo(
    () =>
      [...(selectedCalendario?.entradas ?? [])].sort((a, b) => a.numero - b.numero),
    [selectedCalendario]
  )

  const totalSelecionadas = selectedIds.size
  const allSelected =
    entradasOrdenadas.length > 0 && totalSelecionadas === entradasOrdenadas.length

  const handleClienteChange = (id: string | null) => {
    if (!id) return
    setSelectedClienteId(id)
    setSelectedClienteClient(id)
    setSelectedIds(new Set())
  }

  const toggleEntrada = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(entradasOrdenadas.map((e) => e.id)))
    }
  }

  const handleExport = async () => {
    if (totalSelecionadas === 0) {
      toast.error('Selecione pelo menos uma entrada')
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/calendario/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entradaIds: Array.from(selectedIds) }),
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
      a.download = disposition.match(/filename="?([^"]+)"?/)?.[1] || 'calendario.xlsx'
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
    return (
      <p className="text-muted-foreground">Nenhum cliente cadastrado.</p>
    )
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
          {entradasOrdenadas.length} entradas selecionadas
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} disabled={entradasOrdenadas.length === 0}>
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
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? 'Exportando...' : 'Exportar selecionadas'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="h-10 w-10 px-3 text-left">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                </th>
                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Nº</th>
                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Data</th>
                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Tema</th>
                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Plataforma</th>
                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Imgs</th>
                <th className="h-10 px-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {entradasOrdenadas.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Este calendário não tem entradas.
                  </td>
                </tr>
              )}
              {entradasOrdenadas.map((ent) => {
                const isChecked = selectedIds.has(ent.id)
                return (
                  <tr
                    key={ent.id}
                    onClick={() => toggleEntrada(ent.id)}
                    className={cn(
                      'border-b last:border-0 cursor-pointer transition-colors hover:bg-accent/30',
                      isChecked && 'bg-primary/5'
                    )}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleEntrada(ent.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Selecionar entrada #${ent.numero}`}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium">#{ent.numero}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {format(parseISO(ent.data_post), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-3 py-2 max-w-md truncate">{ent.tema || '—'}</td>
                    <td className="px-3 py-2">{ent.plataforma || '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{ent.imagens?.length ?? 0}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        {isChecked && (
                          <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                        )}
                        {ent.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
