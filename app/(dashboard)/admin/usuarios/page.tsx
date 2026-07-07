import { listarUsuarios } from '@/app/actions/admin'
import type { UsuarioComCliente } from '@/app/actions/admin'
import { getProfile } from '@/lib/auth'
import { CriarClienteForm } from '@/components/criar-cliente-form'
import { UsuarioRowActionsFull } from '@/components/usuario-row-actions-full'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function UsuariosPage() {
  const { user } = await getProfile()
  const usuarios: UsuarioComCliente[] = await listarUsuarios()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes e usuários</h1>
        <p className="text-muted-foreground">Gerencie clientes e seus acessos.</p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Novo cliente</h2>
        <CriarClienteForm />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.papel === 'admin' ? 'default' : 'secondary'}>{u.papel}</Badge>
                </TableCell>
                <TableCell>{u.clientes?.nome || '-'}</TableCell>
                <TableCell>
                  <Badge variant={u.ativo ? 'default' : 'destructive'}>
                    {u.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <UsuarioRowActionsFull usuario={u} currentAdminId={user.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}


