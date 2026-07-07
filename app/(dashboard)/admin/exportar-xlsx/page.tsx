import { getCalendarioAdmin } from '@/app/actions/calendario'
import { ExportarXlsxClient } from '@/components/exportar-xlsx-client'
import { getSelectedClienteServer } from '@/lib/utils-cliente.server'

export const metadata = {
  title: 'Exportar xlsx — calendZip',
}

export default async function ExportarXlsxPage() {
  const calendarios = await getCalendarioAdmin()
  const cookieId = await getSelectedClienteServer()
  const validIds = new Set(calendarios.map((c) => c.id))
  const defaultClienteId = cookieId && validIds.has(cookieId)
    ? cookieId
    : calendarios[0]?.id ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Exportar xlsx</h1>
        <p className="text-muted-foreground">
          Selecione as entradas que deseja exportar para uma planilha.
        </p>
      </div>
      <ExportarXlsxClient calendarios={calendarios} defaultClienteId={defaultClienteId} />
    </div>
  )
}
