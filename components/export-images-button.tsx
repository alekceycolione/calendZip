'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ExportImagesButton({ calendarioId }: { calendarioId?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      const qs = calendarioId ? `?calendarioId=${encodeURIComponent(calendarioId)}` : ''
      const res = await fetch(`/api/calendario/export-images${qs}`)

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Erro ${res.status}`)
      }

      const blob = await res.blob()
      const downloadUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      const disposition = res.headers.get('Content-Disposition') || ''
      const fileName =
        disposition.match(/filename="?([^"]+)"?/)?.[1] || 'calendzip-imagens.zip'
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(downloadUrl)

      toast.success('Download iniciado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar imagens')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant="outline"
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-4 w-4" aria-hidden="true" />
      )}
      {isLoading ? 'Exportando...' : 'Exportar imagens'}
    </Button>
  )
}
