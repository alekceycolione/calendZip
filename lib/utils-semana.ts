import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const DIA_SEMANA_INICIO = 1 // segunda (0=dom, 1=seg, ...)

export function parseDataPost(s: string): Date {
  return startOfDay(parseISO(s + 'T00:00:00'))
}

export function inicioSemana(data: Date): Date {
  return startOfWeek(data, { weekStartsOn: DIA_SEMANA_INICIO })
}

export function fimSemana(data: Date): Date {
  return addDays(inicioSemana(data), 6)
}

export type Semana = {
  inicio: Date
  fim: Date
  chave: string
  labelCurto: string
  labelLongo: string
}

export function chaveSemana(data: Date): string {
  return format(inicioSemana(data), 'yyyy-MM-dd')
}

export function labelSemanaCurto(semana: Semana): string {
  return `Sem ${format(semana.inicio, 'II', { locale: ptBR })}`
}

export function labelSemanaLongo(semana: Semana): string {
  const mesmoMes = format(semana.inicio, 'MM/yyyy') === format(semana.fim, 'MM/yyyy')
  if (mesmoMes) {
    return `${format(semana.inicio, 'd', { locale: ptBR })}–${format(semana.fim, "d 'de' MMM", { locale: ptBR })}`
  }
  return `${format(semana.inicio, "d 'de' MMM", { locale: ptBR })} – ${format(semana.fim, "d 'de' MMM", { locale: ptBR })}`
}

export function gerarSemanasDoIntervalo(inicio: Date, fim: Date): Semana[] {
  const semanas: Semana[] = []
  let cursor = inicioSemana(inicio)
  const fimAbs = inicioSemana(fim)
  while (!isBefore(fimAbs, cursor)) {
    semanas.push({
      inicio: cursor,
      fim: addDays(cursor, 6),
      chave: format(cursor, 'yyyy-MM-dd'),
      labelCurto: '',
      labelLongo: '',
    })
    cursor = addDays(cursor, 7)
  }
  return semanas
}

export type EntradaKanban = {
  id: string
  data_post: string
  numero?: number
}

export function agruparPorSemana<T extends EntradaKanban>(
  entradas: T[],
  semanas: Semana[]
): Map<string, T[]> {
  const buckets = new Map<string, T[]>()
  for (const s of semanas) buckets.set(s.chave, [])

  for (const e of entradas) {
    const data = parseDataPost(e.data_post)
    const chave = chaveSemana(data)
    const lista = buckets.get(chave)
    if (lista) lista.push(e)
  }

  for (const [, lista] of buckets) {
    lista.sort((a, b) => a.data_post.localeCompare(b.data_post))
  }

  return buckets
}

export function preservarDiaDaSemana(dataOriginal: string, semanaDestino: Date): string {
  const original = parseDataPost(dataOriginal)
  const origemInicio = inicioSemana(original)
  const offset = differenceInCalendarDays(original, origemInicio)
  const novaData = addDays(semanaDestino, offset)
  return format(novaData, 'yyyy-MM-dd')
}

export function semanaPassada(semana: Semana): boolean {
  const hoje = startOfDay(new Date())
  return isBefore(semana.fim, hoje)
}

export function formatarDataCurta(s: string): string {
  return format(parseDataPost(s), "d 'de' MMM", { locale: ptBR })
}
