import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const PLATAFORMA_INSTAGRAM_REGEX = /instagram/i
const PLATAFORMA_STORIES_REGEX = /(stories|reels?)/i
const PLATAFORMA_LINKEDIN_REGEX = /linkedin/i

export type PlataformaCores = {
  badge: string
  cardBg: string
  cardBorda: string
  dot: string
  nome: string
}

export function normalizarPlataforma(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(/^[^\s]+\s/, '').trim() || raw.trim()
}

export function coresPlataforma(plataforma: string | null | undefined): PlataformaCores {
  const nome = normalizarPlataforma(plataforma)
  if (!nome) {
    return {
      badge: 'bg-muted text-muted-foreground border-border',
      cardBg: 'bg-card',
      cardBorda: 'border-border',
      dot: 'bg-muted-foreground/40',
      nome: '',
    }
  }
  if (PLATAFORMA_INSTAGRAM_REGEX.test(nome) || PLATAFORMA_STORIES_REGEX.test(nome)) {
    return {
      badge: 'bg-pink-500 text-white border-transparent',
      cardBg: 'bg-pink-100 dark:bg-pink-950/30',
      cardBorda: 'border-pink-300 dark:border-pink-800/50',
      dot: 'bg-pink-500',
      nome,
    }
  }
  if (PLATAFORMA_LINKEDIN_REGEX.test(nome)) {
    return {
      badge: 'bg-blue-600 text-white border-transparent',
      cardBg: 'bg-blue-100 dark:bg-blue-950/30',
      cardBorda: 'border-blue-300 dark:border-blue-800/50',
      dot: 'bg-blue-600',
      nome,
    }
  }
  return {
    badge: 'bg-muted text-muted-foreground border-border',
    cardBg: 'bg-card',
    cardBorda: 'border-border',
    dot: 'bg-muted-foreground/40',
    nome,
  }
}
