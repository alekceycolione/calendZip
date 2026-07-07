import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CalendarDays } from 'lucide-react'
import Link from 'next/link'

const mensagensErro: Record<string, string> = {
  vazio: 'Preencha e-mail e senha.',
  sessao: 'Não foi possível obter a sessão.',
  perfil: 'Perfil não encontrado ou inativo. Contate o administrador.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>
}) {
  const params = await searchParams
  const erroParam = params.erro
  const erro = erroParam
    ? mensagensErro[erroParam] || `Erro: ${erroParam}`
    : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">calendZip</CardTitle>
          <CardDescription>
            Entre com seu e-mail e senha para acessar seu calendário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/api/auth/login" method="POST" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </div>
            {erro && (
              <p className="text-sm text-destructive" role="alert">
                {erro}
              </p>
            )}
            <Button type="submit" className="w-full">
              Entrar
            </Button>
            <p className="text-center text-sm">
              <Link href="/recuperar-senha" className="text-primary hover:underline">
                Esqueceu a senha?
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
