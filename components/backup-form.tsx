'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Download, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Cliente = { id: string; nome: string }

export function BackupForm({ clientes }: { clientes: Cliente[] }) {
  const [clienteId, setClienteId] = useState<string>('')
  const [inicio, setInicio] = useState<string>('')
  const [fim, setFim] = useState<string>('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const clienteSelecionado = clientes.find((c) => c.id === clienteId)
  const selectedLabel = clienteSelecionado?.nome || ''

  const formValido =
    !!clienteId && !!inicio && !!fim && /^\d{4}-\d{2}-\d{2}$/.test(inicio) && /^\d{4}-\d{2}-\d{2}$/.test(fim) && fim >= inicio

  function abrirConfirmacao(e: React.FormEvent) {
    e.preventDefault()
    if (!formValido) {
      toast.error('Preencha cliente, data início e data fim (data fim ≥ data início).')
      return
    }
    setConfirmOpen(true)
  }

  function handleConfirm() {
    if (!formValido) return
    setConfirmOpen(false)

    startTransition(async () => {
      try {
        const res = await fetch('/api/backup/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clienteId, inicio, fim }),
        })

        if (!res.ok) {
          let msg = `Erro ${res.status}`
          try {
            const data = await res.json()
            if (data?.error) msg = data.error
          } catch {
            /* ignore */
          }
          toast.error(msg)
          return
        }

        const contentDisposition = res.headers.get('Content-Disposition') || ''
        const matchUtf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
        const matchSimple = contentDisposition.match(/filename="?([^";]+)"?/)
        const filename = matchUtf8
          ? decodeURIComponent(matchUtf8[1])
          : matchSimple?.[1] || 'backup.pdf'

        const statsHeader = res.headers.get('X-Backup-Stats')
        let stats: { entradasRemovidas: number; alteracoesRemovidas: number } | null = null
        if (statsHeader) {
          try {
            stats = JSON.parse(statsHeader)
          } catch {
            /* ignore */
          }
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        if (stats) {
          toast.success(
            `Backup gerado! ${stats.entradasRemovidas} entrada(s) e ${stats.alteracoesRemovidas} alteração(ões) removidas do banco.`
          )
        } else {
          toast.success('Backup gerado!')
        }

        setInicio('')
        setFim('')
      } catch (err) {
        toast.error('Erro inesperado: ' + (err instanceof Error ? err.message : String(err)))
      }
    })
  }

  return (
    <>
      <form onSubmit={abrirConfirmacao} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente</Label>
          <Select value={clienteId} onValueChange={(v) => v && setClienteId(v)}>
            <SelectTrigger id="cliente" className="w-full">
              <SelectValue placeholder="Selecione um cliente">
                {selectedLabel}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clientes.length === 0 ? (
                <SelectItem value="__none__" disabled>
                  Nenhum cliente cadastrado
                </SelectItem>
              ) : (
                clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="inicio">Data início</Label>
            <Input
              id="inicio"
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fim">Data fim</Label>
            <Input
              id="fim"
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-400 flex gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            O backup gera um PDF pesquisável e <strong>remove permanentemente</strong> as postagens
            e edições do intervalo do banco de dados. Após o download, a operação não pode ser
            desfeita.
          </p>
        </div>

        <Button type="submit" disabled={!formValido || isPending} className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Gerando backup…
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Gerar e baixar backup
            </>
          )}
        </Button>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar backup
            </DialogTitle>
            <DialogDescription>
              Esta ação vai gerar o PDF e <strong>apagar permanentemente</strong> os dados do
              intervalo selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Cliente:</strong> {clienteSelecionado?.nome || '-'}
            </p>
            <p>
              <strong>Período:</strong> {inicio || '-'} até {fim || '-'}
            </p>
            <p className="text-muted-foreground pt-2 border-t">
              O PDF será baixado automaticamente. Certifique-se de guardá-lo em local seguro
              antes de continuar, pois os dados serão removidos do banco.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando…
                </>
              ) : (
                'Confirmar e baixar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
