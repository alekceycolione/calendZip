'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bell } from 'lucide-react'
import { toast } from 'sonner'

export function ProcessarNotificacoes() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notificacoes', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar')
      toast.success(`${data.processadas} notificação(ões) processada(s)`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao processar notificações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleClick} disabled={loading}>
      <Bell className="mr-2 h-4 w-4" />
      {loading ? 'Processando...' : 'Reprocessar notificações'}
    </Button>
  )
}
