import { listarAlteracoes } from '@/app/actions/admin'
import type { AlteracaoComDetalhes } from '@/app/actions/admin'
import { ProcessarNotificacoes } from '@/components/processar-notificacoes'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function AlteracoesPage() {
  const alteracoes: AlteracaoComDetalhes[] = await listarAlteracoes()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Histórico de alterações</h1>
          <p className="text-muted-foreground">
            Acompanhamento de todas as mudanças feitas pelos clientes.
          </p>
        </div>
        <ProcessarNotificacoes />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Postagem</TableHead>
                <TableHead>Campos alterados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alteracoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma alteração registrada.
                  </TableCell>
                </TableRow>
              )}
              {alteracoes.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {new Date(a.criado_em).toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {a.usuarios?.clientes?.nome || '-'}
                  </TableCell>
                  <TableCell>{a.usuarios?.nome}</TableCell>
                  <TableCell>
                    #{a.entradas?.numero} — {a.entradas?.tema}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(a.diff).map((campo) => (
                        <Badge key={campo} variant="outline">
                          {campo}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
