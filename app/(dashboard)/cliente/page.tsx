import { getCalendarioDoCliente, listarAlteracoesDoCalendario } from '@/app/actions/calendario'
import { getProfile } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Clock, Edit, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function ClientePage() {
  const { profile } = await getProfile()
  const calendario = await getCalendarioDoCliente()
  const alteracoes = await listarAlteracoesDoCalendario(calendario.id)

  const total = calendario.entradas.length
  const planejado = calendario.entradas.filter((e) => e.status === 'planejado').length
  const alterado = calendario.entradas.filter((e) => e.status === 'alterado').length
  const publicado = calendario.entradas.filter((e) => e.status === 'publicado').length
  const porcentagemPublicado = total > 0 ? Math.round((publicado / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Olá, {profile.nome}!</h1>
          <p className="text-muted-foreground">
            Acompanhe o andamento das postagens e as alterações recentes no seu calendário.
          </p>
        </div>
        <Link href="/cliente/calendario">
          <Button className="gap-2">
            Ver Calendário Editorial
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Posts"
          value={total}
          icon={<FileSpreadsheet className="h-5 w-5" />}
        />
        <MetricCard
          title="Posts Planejados"
          value={planejado}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          title="Ajustes Solicitados"
          value={alterado}
          icon={<Edit className="h-5 w-5" />}
        />
        <MetricCard
          title="Posts Publicados"
          value={publicado}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      {/* Progresso de Publicação */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold">Progresso da Grade Editorial</h2>
            <p className="text-sm text-muted-foreground">
              Porcentagem de postagens publicadas nas redes sociais.
            </p>
          </div>
          <span className="text-2xl font-bold text-primary">{porcentagemPublicado}%</span>
        </div>
        <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 rounded-full"
            style={{ width: `${porcentagemPublicado}%` }}
          />
        </div>
      </div>

      {/* Histórico Recente */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Atividade recente no seu calendário</h2>
        {alteracoes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {alteracoes.map((a) => (
              <li
                key={a.id}
                className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {a.usuarios?.nome} editou #{a.entradas?.numero} — {a.entradas?.tema}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Badge variant="outline">
                  {Object.keys(a.diff).length} campo(s) alterado(s)
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-card-foreground">{value}</p>
      </CardContent>
    </Card>
  )
}
