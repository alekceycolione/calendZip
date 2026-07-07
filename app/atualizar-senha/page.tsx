'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

function AtualizarSenhaContent() {
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isExchanging, setIsExchanging] = useState(true)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isPending, startTransition] = useTransition()

  const supabase = createClient()

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsValidSession(true)
        } else {
          toast.error('Acesso expirado ou link inválido. Solicite a redefinição de senha novamente.')
          router.push('/login')
        }
      } catch (err) {
        console.error(err)
        toast.error('Erro ao processar a autenticação.')
        router.push('/login')
      } finally {
        setIsExchanging(false)
      }
    }

    checkSession()
  }, [router, supabase.auth])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!password) {
      toast.error('Preencha a nova senha.')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.')
      return
    }

    startTransition(async () => {
      try {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) {
          toast.error(`Erro ao atualizar senha: ${error.message}`)
        } else {
          toast.success('Senha redefinida com sucesso! Faça login com a nova senha.')
          // Desloga para limpar a sessão temporária
          await supabase.auth.signOut()
          router.push('/login')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro inesperado ao redefinir a senha.')
      }
    })
  }

  if (isExchanging) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground animate-pulse">Verificando suas credenciais...</p>
      </div>
    )
  }

  if (!isValidSession) {
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova Senha</Label>
        <Input
          id="password"
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
        <Input
          id="confirm_password"
          type="password"
          required
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isPending}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar nova senha'}
      </Button>
    </form>
  )
}

export default function AtualizarSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Atualizar Senha</CardTitle>
          <CardDescription>
            Defina sua nova senha de acesso abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-center py-6"><p className="text-muted-foreground">Carregando...</p></div>}>
            <AtualizarSenhaContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
