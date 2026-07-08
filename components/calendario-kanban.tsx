'use client'

import { useMemo, useState, useTransition, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { KanbanCard, KanbanCardEntrada } from '@/components/kanban-card'
import { KanbanColumn } from '@/components/kanban-column'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  type Semana,
  agruparPorSemana,
  chaveSemana,
  formatarDataCurta,
  formatarHoraCurta,
  gerarSemanasDoIntervalo,
  labelSemanaCurto,
  labelSemanaLongo,
  parseDataPost,
  preservarDiaDaSemana,
  semanaPassada,
  subtrairHora,
} from '@/lib/utils-semana'
import { reagendarEntrada } from '@/app/actions/calendario'
import { startOfDay, parseISO } from 'date-fns'

type Entrada = KanbanCardEntrada

type Props = {
  entradas: Entrada[]
  onCardClick?: (entrada: Entrada) => void
  isAdmin?: boolean
}

function entradaPorId(entradas: Entrada[], id: string): Entrada | undefined {
  return entradas.find((e) => e.id === id)
}

export function CalendarioKanban({ entradas: entradasIniciais, onCardClick, isAdmin = false }: Props) {
  const [entradas, setEntradas] = useState<Entrada[]>(entradasIniciais)
  const [entradasAnteriores, setEntradasAnteriores] = useState<Entrada[]>(entradasIniciais)
  if (entradasIniciais !== entradasAnteriores) {
    setEntradasAnteriores(entradasIniciais)
    setEntradas(entradasIniciais)
  }
  const [filtroPlataforma, setFiltroPlataforma] = useState<string>('__todas__')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const prevSnapshotRef = useRef<Entrada[] | null>(null)

  const plataformas = useMemo(() => {
    const set = new Set<string>()
    for (const e of entradasIniciais) {
      if (e.plataforma) set.add(e.plataforma)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [entradasIniciais])

  const entradasFiltradas = useMemo(() => {
    if (filtroPlataforma === '__todas__') return entradas
    return entradas.filter((e) => e.plataforma === filtroPlataforma)
  }, [entradas, filtroPlataforma])

  const semanas: Semana[] = useMemo(() => {
    if (entradasFiltradas.length === 0) {
      const hoje = startOfDay(new Date())
      return gerarSemanasDoIntervalo(hoje, hoje)
    }
    const datas = entradasFiltradas
      .map((e) => parseISO(e.data_post + 'T00:00:00'))
      .filter((d) => !isNaN(d.getTime()))
    if (datas.length === 0) return []
    const min = new Date(Math.min(...datas.map((d) => d.getTime())))
    const max = new Date(Math.max(...datas.map((d) => d.getTime())))
    return gerarSemanasDoIntervalo(min, max)
  }, [entradasFiltradas])

  const buckets = useMemo(() => {
    return agruparPorSemana(entradasFiltradas, semanas)
  }, [entradasFiltradas, semanas])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const dragEntrada = dragId ? entradaPorId(entradas, dragId) : null

  function handleDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id))
  }

  function handleDragOver(e: DragOverEvent) {
    setOverColumnId(e.over ? String(e.over.id) : null)
  }

  function handleDragCancel() {
    setDragId(null)
    setOverColumnId(null)
    if (prevSnapshotRef.current) {
      setEntradas(prevSnapshotRef.current)
      prevSnapshotRef.current = null
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    setDragId(null)
    setOverColumnId(null)

    if (!overId || activeId === overId) {
      prevSnapshotRef.current = null
      return
    }

    const entrada = entradaPorId(entradas, activeId)
    if (!entrada) {
      prevSnapshotRef.current = null
      return
    }

    const targetCard = entradaPorId(entradas, overId)
    let colunaChave: string
    let novaData: string
    let novaHora: string | undefined

    if (targetCard) {
      colunaChave = chaveSemana(parseDataPost(targetCard.data_post))
      novaData = targetCard.data_post
      novaHora = subtrairHora(targetCard.hora_prevista, 1)
    } else {
      colunaChave = overId
      const colunaDestino = semanas.find((s) => s.chave === overId)
      if (!colunaDestino) {
        prevSnapshotRef.current = null
        return
      }
      novaData = preservarDiaDaSemana(entrada.data_post, colunaDestino.inicio)
      novaHora = undefined
    }

    if (!isAdmin && semanaPassada(semanas.find((s) => s.chave === colunaChave)!)) {
      toast.error('Não dá pra reagendar pra uma semana no passado.')
      prevSnapshotRef.current = null
      return
    }

    const horaFinal = novaHora ?? entrada.hora_prevista
    if (novaData === entrada.data_post && horaFinal === entrada.hora_prevista) {
      prevSnapshotRef.current = null
      return
    }

    prevSnapshotRef.current = entradas
    const dataAntiga = entrada.data_post
    const horaAntiga = entrada.hora_prevista
    setEntradas((prev) =>
      prev.map((e) =>
        e.id === activeId ? { ...e, data_post: novaData, hora_prevista: horaFinal } : e
      )
    )

    startTransition(async () => {
      const res = await reagendarEntrada(activeId, novaData, novaHora)
      if ('error' in res) {
        if (prevSnapshotRef.current) {
          setEntradas(prevSnapshotRef.current)
        }
        toast.error(res.error)
        prevSnapshotRef.current = null
        return
      }
      prevSnapshotRef.current = null
      const dataMudou = novaData !== dataAntiga
      const horaMudou = horaFinal !== horaAntiga
      if (dataMudou && horaMudou) {
        toast.success(
          `Reagendado: #${entrada.numero} → ${formatarDataCurta(novaData)} ${formatarHoraCurta(horaFinal)}`
        )
      } else if (dataMudou) {
        toast.success(
          `Reagendado: #${entrada.numero} de ${formatarDataCurta(dataAntiga)} → ${formatarDataCurta(novaData)}`
        )
      } else {
        toast.success(
          `Reagendado: #${entrada.numero} para ${formatarHoraCurta(horaFinal)}`
        )
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Plataforma:</span>
        <Select value={filtroPlataforma} onValueChange={(v) => v && setFiltroPlataforma(v)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todas">
              {filtroPlataforma === '__todas__' ? 'Todas' : filtroPlataforma}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todas__">Todas</SelectItem>
            {plataformas.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {entradasFiltradas.length} postagem(ns) · {semanas.length} semana(s)
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Arraste entre semanas ou sobre outro card para re-agendar (data + hora). Clique para editar.
      </p>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{ scrollbarGutter: 'stable' }}
        >
          {semanas.map((s) => {
            const cards = buckets.get(s.chave) || []
            const isPast = semanaPassada(s)
            return (
              <KanbanColumn
                key={s.chave}
                id={s.chave}
                isPast={isPast}
                isOver={overColumnId === s.chave && !!dragId}
                isAdmin={isAdmin}
              >
                <div className="border-b p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {labelSemanaCurto(s)}
                  </p>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {labelSemanaLongo(s)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {cards.length} postagem(ns)
                  </p>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2 max-h-[calc(100vh-280px)]">
                  {cards.length === 0 && (
                    <p className="text-center text-xs text-muted-foreground py-6 select-none">
                      {isPast ? 'Semana passada' : 'Nenhuma postagem'}
                    </p>
                  )}
                  {cards.map((e) => (
                    <KanbanCard
                      key={e.id}
                      entrada={e}
                      onClick={onCardClick}
                      disabled={isPending || (isPast && !isAdmin)}
                    />
                  ))}
                </div>
              </KanbanColumn>
            )
          })}
        </div>

        <DragOverlay>
          {dragEntrada ? <KanbanCard entrada={dragEntrada} disabled /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
