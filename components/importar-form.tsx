'use client'

import { useState, useTransition } from 'react'
import { importarCalendario } from '@/app/actions/admin'
import type { ClienteSimples } from '@/app/actions/admin'
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
import { toast } from 'sonner'
import { TriangleAlert } from 'lucide-react'
import Link from 'next/link'

export function ImportarForm({ clientes }: { clientes: ClienteSimples[] }) {
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[] | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId || !arquivo) {
      toast.error('Selecione um cliente e um arquivo.')
      return
    }

    startTransition(async () => {
      const buffer = await arquivo.arrayBuffer()
      const result = await importarCalendario(clienteId, buffer)
      if (result.success) {
        toast.success(`${result.importados} entradas importadas.`)
        setArquivo(null)
        setPreview(null)
      } else {
        setPreview(result.erros || null)
        toast.error('Importação falhou. Verifique os erros.')
      }
    })
  }

  return (
    <>
      {clientes.length === 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
        >
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-destructive">
              Nenhum cliente cadastrado no banco de dados.
            </p>
            <p className="text-muted-foreground">
              Para importar um calendário, primeiro crie um cliente em{' '}
              <Link
                href="/admin/usuarios"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Clientes e usuários
              </Link>
              . O cliente é o proprietário do calendário e da planilha importada.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="cliente_id">Cliente</Label>
          <Select value={clienteId} onValueChange={(v) => setClienteId(v as string)}>
            <SelectTrigger id="cliente_id" className="w-full" aria-required>
              <SelectValue placeholder="Selecione um cliente">
                {clientes.find((c) => c.id === clienteId)?.nome ?? ''}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clientes.length === 0 ? (
                <SelectItem value="__vazio__" disabled>
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

        <div className="space-y-2">
          <Label htmlFor="arquivo">Arquivo .xlsx</Label>
          <Input
            id="arquivo"
            type="file"
            accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
            required
          />
        </div>

        <Button type="submit" disabled={isPending || !clienteId}>
          {isPending ? 'Importando...' : 'Importar'}
        </Button>
      </form>

      {preview && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <h3 className="font-semibold text-destructive mb-2">Erros encontrados</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            {preview.map((erro, i) => (
              <li key={i}>{erro}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}