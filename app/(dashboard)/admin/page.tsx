import { getCalendarioAdmin } from '@/app/actions/calendario'
import type { CalendarioComEntradas } from '@/app/actions/calendario'
import { listarAlteracoes } from '@/app/actions/admin'
import type { AlteracaoComDetalhes } from '@/app/actions/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, Users, Bell, FileSpreadsheet } from 'lucide-react'
import { ExportButton } from '@/components/export-button'

export default async function AdminPage() {
  const calendarios: CalendarioComEntradas[] = await getCalendarioAdmin()
  const alteracoes: AlteracaoComDetalhes[] = await listarAlteracoes()

  const listaCalendarios = Array.isArray(calendarios) ? calendarios : [calendarios]
  const totalEntradas = listaCalendarios.reduce(
    (acc, c) => acc + (c.entradas?.length || 0),
    0
  )

  const naoVistas = alteracoes.filter((a) => {
    const notif = (a as unknown as { notificacoes?: { estado: string }[] }).notificacoes
    return !notif || notif.some((n) => n.estado === 'falha' || n.estado === 'falha_definitiva')
  }).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos calendários e atividades recentes.</p>
        </div>
        <ExportButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Calendários"
          value={Array.isArray(calendarios) ? calendarios.length : 1}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <MetricCard
          title="Postagens"
          value={totalEntradas}
          icon={<FileSpreadsheet className="h-5 w-5" />}
        />
        <MetricCard
          title="Clientes"
          value={Array.isArray(calendarios) ? calendarios.length : 1}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          title="Alterações recentes"
          value={alteracoes.length}
          icon={<Bell className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Alterações mais recentes</h2>
        {alteracoes.slice(0, 5).length === 0 ? (
          <p className="text-muted-foreground">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ul className="space-y-3">
            {alteracoes.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0">
                <div>
                  <p className="text-sm font-medium">
                    {a.usuarios?.nome} editou #{a.entradas?.numero} — {a.entradas?.tema}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Badge variant="outline">
                  {Object.keys(a.diff).length} campo(s)
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
