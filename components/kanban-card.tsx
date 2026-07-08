'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ImageOff, GripVertical, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatarDataCurta, formatarHoraCurta } from '@/lib/utils-semana'
import { coresPlataforma } from '@/lib/utils-plataforma'

export type KanbanCardEntrada = {
  id: string
  numero: number
  tema: string | null
  data_post: string
  hora_prevista: string
  plataforma: string | null
  status: string
  imagens: string[] | null
  [key: string]: unknown
}

const STATUS_STYLES: Record<string, string> = {
  planejado: 'bg-muted text-muted-foreground border-border',
  alterado: 'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400',
  publicado: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400',
}

function statusLabel(s: string): string {
  return { planejado: 'Planejado', alterado: 'Alterado', publicado: 'Publicado' }[s] || s
}

export function KanbanCard({
  entrada,
  onClick,
  disabled = false,
}: {
  entrada: KanbanCardEntrada
  onClick?: (entrada: KanbanCardEntrada) => void
  disabled?: boolean
}) {
  const [imgError, setImgError] = useState(false)
  const capa = entrada.imagens && entrada.imagens.length > 0 ? entrada.imagens[0] : null
  const mostrarImagem = !!capa && !imgError

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entrada.id,
    data: { type: 'entrada', entrada },
    disabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const statusClass = STATUS_STYLES[entrada.status] || STATUS_STYLES.planejado
  const plataforma = coresPlataforma(entrada.plataforma)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border bg-card p-3 shadow-sm transition-shadow select-none',
        !disabled && 'hover:shadow-md cursor-grab active:cursor-grabbing',
        disabled && 'cursor-not-allowed opacity-60',
        isDragging && 'shadow-lg ring-2 ring-primary/30 cursor-grabbing'
      )}
      onClick={(e) => {
        if (isDragging) return
        onClick?.(entrada)
        e.stopPropagation()
      }}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        {!disabled && (
          <span
            aria-hidden="true"
            className="mt-0.5 -ml-1 text-muted-foreground/50 group-hover:text-foreground/80"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        )}

        <div className="h-8 w-8 shrink-0 rounded overflow-hidden border bg-muted flex items-center justify-center">
          {mostrarImagem ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capa}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <ImageOff className="h-3.5 w-3.5 text-muted-foreground/50" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground shrink-0">#{entrada.numero}</span>
            <p className="text-sm font-medium text-foreground line-clamp-2 break-words">
              {entrada.tema || <span className="text-muted-foreground italic">(Sem tema)</span>}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate flex items-center gap-1">
            <span>{formatarDataCurta(entrada.data_post)}</span>
            <span aria-hidden="true">·</span>
            <Clock className="h-3 w-3" aria-hidden="true" />
            <span>{formatarHoraCurta(entrada.hora_prevista)}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {plataforma.nome && (
              <Badge
                variant="outline"
                className={cn('text-[10px] px-1.5 py-0', plataforma.badge)}
                title={entrada.plataforma || plataforma.nome}
              >
                {plataforma.nome}
              </Badge>
            )}
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', statusClass)}>
              {statusLabel(entrada.status)}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
