import { getCalendarioAdmin } from '@/app/actions/calendario'
import { SelectCliente } from '@/components/select-cliente'
import { CalendarioCliente } from '@/components/calendario-cliente'
import { CalendarioViewToggle, type ViewMode } from '@/components/calendario-view-toggle'
import { AlertCircle } from 'lucide-react'
import { getSelectedClienteServer } from '@/lib/utils-cliente.server'

export default async function AdminCalendariosPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; view?: string }>
}) {
  const params = await searchParams
  const view: ViewMode = params.view === 'kanban' ? 'kanban' : 'table'
  const calendarios = await getCalendarioAdmin()
  const validIds = new Set(calendarios.map((c) => c.id))

  // Prioridade: ?id=xxx no URL → cookie → primeiro calendário
  const cookieId = await getSelectedClienteServer()
  const fallbackId = calendarios[0]?.id

  let defaultId: string | undefined
  if (params.id && validIds.has(params.id)) {
    defaultId = params.id
  } else if (cookieId && validIds.has(cookieId)) {
    defaultId = cookieId
  } else {
    defaultId = fallbackId
  }

  const selectedCalendario = defaultId
    ? calendarios.find((c) => c.id === defaultId)
    : undefined

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visualizar Calendários</h1>
          <p className="text-muted-foreground">
            Acompanhe e edite as postagens de todos os clientes exatamente como eles veem.
          </p>
        </div>
      </div>

      {calendarios.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="space-y-1 text-sm text-destructive">
            <p className="font-semibold">Nenhum calendário encontrado.</p>
            <p className="text-muted-foreground text-destructive/80">
              Cadastre um cliente e importe seu respectivo calendário a partir de uma planilha para visualizá-lo aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <SelectCliente calendarios={calendarios} selectedId={selectedCalendario?.id} />

          {selectedCalendario ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="text-xl font-medium text-foreground">
                    {selectedCalendario.titulo}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Proprietário: {selectedCalendario.clientes?.nome || 'N/A'}
                  </p>
                </div>
                <CalendarioViewToggle value={view} />
              </div>

              <CalendarioCliente
                entradas={selectedCalendario.entradas}
                calendarioId={selectedCalendario.id}
                isAdmin={true}
                viewMode={view}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">Selecione um cliente para exibir o calendário.</p>
          )}
        </div>
      )}
    </div>
  )
}
