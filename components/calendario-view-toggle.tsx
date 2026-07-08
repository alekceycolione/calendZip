'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutList, LayoutGrid } from 'lucide-react'

export type ViewMode = 'table' | 'kanban'

function normalizarView(v: string | null | undefined): ViewMode {
  return v === 'kanban' ? 'kanban' : 'table'
}

export function CalendarioViewToggle({ value }: { value: ViewMode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    const mode = normalizarView(next)
    if (mode === 'table') {
      params.delete('view')
    } else {
      params.set('view', 'kanban')
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <Tabs value={value} onValueChange={handleChange}>
      <TabsList>
        <TabsTrigger value="table">
          <LayoutList className="h-4 w-4 mr-1.5" />
          Tabela
        </TabsTrigger>
        <TabsTrigger value="kanban">
          <LayoutGrid className="h-4 w-4 mr-1.5" />
          Kanban
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
