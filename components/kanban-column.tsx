'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

export function KanbanColumn({
  id,
  children,
  className,
  isPast,
  isOver,
  isAdmin = false,
}: {
  id: string
  children: React.ReactNode
  className?: string
  isPast?: boolean
  isOver?: boolean
  isAdmin?: boolean
}) {
  const { setNodeRef, isOver: over } = useDroppable({ id, data: { type: 'coluna' } })
  const ativo = isOver ?? over
  const bloqueada = isPast && !isAdmin

  return (
    <div
      ref={setNodeRef}
      data-past={isPast ? 'true' : 'false'}
      className={cn(
        'flex w-64 shrink-0 flex-col rounded-xl border bg-card/50 transition-colors',
        ativo && !bloqueada && 'border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/20',
        bloqueada && 'opacity-60',
        isPast && isAdmin && 'opacity-90',
        className
      )}
    >
      {children}
    </div>
  )
}
