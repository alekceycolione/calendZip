import { listarAlteracoesPaginadas } from '@/app/actions/admin'
import { ProcessarNotificacoes } from '@/components/processar-notificacoes'
import { Pagination } from '@/components/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const PAGE_SIZE = 20

type PageProps = {
  searchParams: Promise<{ page?: string | string[] }>
}

function paginaValida(raw: string | string[] | undefined): number {
  const valor = Array.isArray(raw) ? raw[0] : raw
  const n = Number.parseInt(valor ?? '1', 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export default async function AlteracoesPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page = paginaValida(pageParam)
  const { data: alteracoes, totalCount, totalPages } = await listarAlteracoesPaginadas(page, PAGE_SIZE)

  const primeiroDaPagina = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const ultimoDaPagina = Math.min(page * PAGE_SIZE, totalCount)

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

        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 border-t">
            <p className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{primeiroDaPagina}</span>–
              <span className="font-medium text-foreground">{ultimoDaPagina}</span> de{' '}
              <span className="font-medium text-foreground">{totalCount}</span>{' '}
              {totalCount === 1 ? 'alteração' : 'alterações'}
            </p>
            <Pagination page={page} totalPages={totalPages} basePath="/admin/alteracoes" />
          </div>
        )}
      </div>
    </div>
  )
}
