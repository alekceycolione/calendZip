import { getCalendarioAdmin } from '@/app/actions/calendario'
import { ExportarImagensClient } from '@/components/exportar-imagens-client'
import { getSelectedClienteServer } from '@/lib/utils-cliente.server'

export const metadata = {
  title: 'Exportar imagens — calendZip',
}

export default async function ExportarImagensPage() {
  const calendarios = await getCalendarioAdmin()
  const cookieId = await getSelectedClienteServer()
  const validIds = new Set(calendarios.map((c) => c.id))
  const defaultClienteId = cookieId && validIds.has(cookieId)
    ? cookieId
    : calendarios[0]?.id ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Exportar imagens</h1>
        <p className="text-muted-foreground">
          Selecione as imagens que deseja baixar em qualidade original.
        </p>
      </div>
      <ExportarImagensClient calendarios={calendarios} defaultClienteId={defaultClienteId} />
    </div>
  )
}
