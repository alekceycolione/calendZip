import { listarClientes } from '@/app/actions/admin'
import { BackupForm } from '@/components/backup-form'
import { FileDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BackupPage() {
  const clientes = await listarClientes()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileDown className="h-7 w-7" />
          Backup em PDF
        </h1>
        <p className="text-muted-foreground mt-1">
          Gera um PDF pesquisável de um cliente em um intervalo de datas e remove os dados do
          banco principal. Use para arquivar conteúdo antigo e manter a base de dados enxuta.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 max-w-2xl">
        <BackupForm clientes={clientes} />
      </div>
    </div>
  )
}
