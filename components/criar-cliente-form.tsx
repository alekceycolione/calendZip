'use client'

import { useActionState, useEffect, useRef } from 'react'
import { criarCliente } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type CriarClienteState = { error: string } | { success: true; message: string } | null

export function CriarClienteForm() {
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction, isPending] = useActionState(
    async (prevState: CriarClienteState, formData: FormData): Promise<CriarClienteState> => {
      try {
        const res = await criarCliente(prevState, formData)
        return res as CriarClienteState
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Erro inesperado ao criar cliente.' }
      }
    },
    null
  )

  useEffect(() => {
    if (!state) return

    if ('error' in state && state.error) {
      toast.error(state.error as string)
    } else if ('success' in state && state.success) {
      toast.success(state.message || 'Cliente e usuário criados com sucesso!')
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
    >
      <div className="space-y-2">
        <Label htmlFor="nome">Nome do cliente</Label>
        <Input id="nome" name="nome" required placeholder="Dr. Fulano" disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="nome_usuario">Nome do usuário</Label>
        <Input id="nome_usuario" name="nome_usuario" required placeholder="Nome completo" disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required placeholder="email@cliente.com" disabled={isPending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha">Senha inicial</Label>
        <Input id="senha" name="senha" type="text" required placeholder="Senha inicial" disabled={isPending} />
      </div>
      <Button type="submit" disabled={isPending} className="md:col-start-1">
        {isPending ? 'Criando...' : 'Criar cliente'}
      </Button>
    </form>
  )
}
