import { listarClientes } from '@/app/actions/admin'
import { ImportarForm } from '@/components/importar-form'

export default async function ImportarPage() {
  const clientes = await listarClientes()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Importar calendário</h1>
        <p className="text-muted-foreground">
          Envie a planilha .xlsx com a aba “Calendário” no padrão do template.
        </p>
      </div>

      <ImportarForm clientes={clientes} />
    </div>
  )
}