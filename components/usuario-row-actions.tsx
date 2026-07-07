'use client'

import { useTransition } from 'react'
import { alternarUsuario } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'

export function UsuarioRowActions({ id, ativo }: { id: string; ativo: boolean }) {
  const [isPending, startTransition] = useTransition()

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const res = await alternarUsuario(id, !ativo)
        if (res?.error) {
          toast.error(res.error)
        } else {
          toast.success(
            ativo
              ? 'Usuário desativado com sucesso!'
              : 'Usuário ativado com sucesso!'
          )
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao alterar status do usuário.')
      }
    })
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      variant={ativo ? 'outline' : 'destructive'}
      size="sm"
    >
      {ativo ? (
        <PowerOff className="mr-2 h-4 w-4" />
      ) : (
        <Power className="mr-2 h-4 w-4" />
      )}
      {isPending ? 'Processando...' : ativo ? 'Desativar' : 'Ativar'}
    </Button>
  )
}
