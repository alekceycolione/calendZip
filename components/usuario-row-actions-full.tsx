'use client'

import { useState, useTransition } from 'react'
import { alternarUsuario, editarUsuarioECliente, excluirUsuarioECliente } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Power, PowerOff, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type UsuarioItem = {
  id: string
  nome: string
  email: string
  papel: 'admin' | 'cliente'
  cliente_id: string | null
  ativo: boolean
  clientes: { nome: string } | null
}

export function UsuarioRowActionsFull({
  usuario,
  currentAdminId,
}: {
  usuario: UsuarioItem
  currentAdminId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Edit form states
  const [nomeUsuario, setNomeUsuario] = useState(usuario.nome)
  const [email, setEmail] = useState(usuario.email)
  const [nomeCliente, setNomeCliente] = useState(usuario.clientes?.nome || '')
  const [senha, setSenha] = useState('')

  const handleToggle = () => {
    startTransition(async () => {
      try {
        const res = await alternarUsuario(usuario.id, !usuario.ativo)
        if (res?.error) {
          toast.error(res.error)
        } else {
          toast.success(
            usuario.ativo
              ? 'Usuário desativado com sucesso!'
              : 'Usuário ativado com sucesso!'
          )
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao alterar status do usuário.')
      }
    })
  }

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeUsuario || !email || (usuario.papel === 'cliente' && !nomeCliente)) {
      toast.error('Preencha todos os campos obrigatórios.')
      return
    }

    startTransition(async () => {
      try {
        const res = await editarUsuarioECliente(usuario.id, usuario.cliente_id, {
          nomeUsuario,
          email,
          nomeCliente: usuario.papel === 'cliente' ? nomeCliente : undefined,
          senha: senha || undefined,
        })
        if (res?.error) {
          toast.error(res.error)
        } else {
          toast.success('Cadastro atualizado com sucesso!')
          setIsEditOpen(false)
          setSenha('')
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao editar usuário.')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const res = await excluirUsuarioECliente(usuario.id, usuario.cliente_id)
        if (res?.error) {
          toast.error(res.error)
        } else {
          toast.success('Cadastro excluído com sucesso!')
          setIsDeleteOpen(false)
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir usuário.')
      }
    })
  }

  const isSelf = usuario.id === currentAdminId

  return (
    <div className="flex items-center justify-end gap-2">
      {/* Toggle active status */}
      <Button
        onClick={handleToggle}
        disabled={isPending}
        variant={usuario.ativo ? 'outline' : 'destructive'}
        size="sm"
        title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}
      >
        {usuario.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
      </Button>

      {/* Edit button */}
      <Button
        onClick={() => {
          setNomeUsuario(usuario.nome)
          setEmail(usuario.email)
          setNomeCliente(usuario.clientes?.nome || '')
          setSenha('')
          setIsEditOpen(true)
        }}
        disabled={isPending}
        variant="outline"
        size="sm"
        title="Editar cadastro"
      >
        <Edit2 className="h-4 w-4" />
      </Button>

      {/* Delete button */}
      <Button
        onClick={() => setIsDeleteOpen(true)}
        disabled={isPending || isSelf}
        variant="ghost"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        size="sm"
        title={isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir cadastro'}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      {/* Dialog: Edit */}
      <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cadastro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit_nome_usuario">Nome do Usuário</Label>
              <Input
                id="edit_nome_usuario"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_email">E-mail</Label>
              <Input
                id="edit_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {usuario.papel === 'cliente' && (
              <div className="space-y-2">
                <Label htmlFor="edit_nome_cliente">Nome do Cliente (Empresa)</Label>
                <Input
                  id="edit_nome_cliente"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit_senha">
                Nova Senha <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="edit_senha"
                type="text"
                placeholder="Deixe em branco para manter a atual"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirm */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => !open && setIsDeleteOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-foreground">
              Tem certeza de que deseja excluir permanentemente o usuário{' '}
              <strong className="font-semibold">{usuario.nome}</strong> (<strong>{usuario.email}</strong>)?
            </p>
            {usuario.papel === 'cliente' && (
              <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 leading-relaxed">
                <strong>ATENÇÃO:</strong> Como este usuário é associado a um cliente, excluir este cadastro irá remover permanentemente a empresa <strong>{usuario.clientes?.nome}</strong>, seu calendário editorial e todas as suas postagens salvas no sistema.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Excluindo...' : 'Excluir Definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
