import { getCalendarioDoCliente } from '@/app/actions/calendario'
import { CalendarioCliente } from '@/components/calendario-cliente'
import { CalendarioViewToggle, type ViewMode } from '@/components/calendario-view-toggle'
import { ExportButton } from '@/components/export-button'
import { ExportImagesButton } from '@/components/export-images-button'

export default async function ClienteCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const view: ViewMode = params.view === 'kanban' ? 'kanban' : 'table'
  const calendario = await getCalendarioDoCliente()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{calendario.titulo}</h1>
          <p className="text-muted-foreground">
            Clique em uma postagem para editar. Lembre-se de salvar suas alterações.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton />
          <ExportImagesButton />
        </div>
      </div>

      <div className="flex justify-end">
        <CalendarioViewToggle value={view} />
      </div>

      <CalendarioCliente
        entradas={calendario.entradas}
        calendarioId={calendario.id}
        viewMode={view}
      />
    </div>
  )
}
