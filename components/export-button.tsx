'use client'

import { Button } from '@/components/ui/button'
import { FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'

export function ExportButton() {
  const handleExport = async () => {
    try {
      const response = await fetch('/api/calendario/export')
      if (!response.ok) throw new Error('Erro ao exportar')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calendario-${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Exportação concluída')
    } catch {
      toast.error('Não foi possível exportar o calendário')
    }
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <FileSpreadsheet className="mr-2 h-4 w-4" />
      Exportar xlsx
    </Button>
  )
}
