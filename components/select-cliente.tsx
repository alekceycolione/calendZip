'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { setSelectedClienteClient } from '@/lib/utils-cliente'

type CalendarioItem = {
  id: string
  titulo: string
  clientes: { nome: string } | null
}

export function SelectCliente({
  calendarios,
  selectedId,
}: {
  calendarios: CalendarioItem[]
  selectedId?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selected = calendarios.find((c) => c.id === selectedId)
  const selectedLabel = selected?.clientes?.nome || selected?.titulo || ''

  const handleValueChange = (val: string | null) => {
    if (val) setSelectedClienteClient(val)
    const params = new URLSearchParams(searchParams.toString())
    if (val) {
      params.set('id', val)
    } else {
      params.delete('id')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card p-4 rounded-xl border max-w-md">
      <Label htmlFor="calendario-select" className="text-sm font-medium whitespace-nowrap">
        Selecionar Cliente:
      </Label>
      <Select value={selectedId} onValueChange={handleValueChange}>
        <SelectTrigger id="calendario-select" className="w-full">
          <SelectValue placeholder="Selecione um calendário">
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
  )
}
