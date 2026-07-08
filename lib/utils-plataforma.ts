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
      dot: 'bg-muted-foreground/40',
      nome: '',
    }
  }
  if (PLATAFORMA_INSTAGRAM_REGEX.test(nome) || PLATAFORMA_STORIES_REGEX.test(nome)) {
    return {
      badge:
        'bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white border-transparent',
      dot: 'bg-[#DD2A7B]',
      nome,
    }
  }
  if (PLATAFORMA_LINKEDIN_REGEX.test(nome)) {
    return {
      badge: 'bg-[#0A66C2] text-white border-transparent',
      dot: 'bg-[#0A66C2]',
      nome,
    }
  }
  return {
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground/40',
    nome,
  }
}
