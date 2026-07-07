import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  totalPages: number
  basePath: string
}

const MAX_VIZINHOS = 1

function construirHref(basePath: string, page: number): string {
  const separador = basePath.includes('?') ? '&' : '?'
  if (page <= 1) return basePath
  return `${basePath}${separador}page=${page}`
}

function gerarPaginasVisiveis(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 1) return []

  const paginas: (number | 'ellipsis')[] = []
  const inicio = Math.max(2, page - MAX_VIZINHOS)
  const fim = Math.min(totalPages - 1, page + MAX_VIZINHOS)

  paginas.push(1)
  if (inicio > 2) paginas.push('ellipsis')
  for (let i = inicio; i <= fim; i++) paginas.push(i)
  if (fim < totalPages - 1) paginas.push('ellipsis')
  if (totalPages > 1) paginas.push(totalPages)

  return paginas
}

function BotaoPaginacao({
  href,
  disabled,
  ariaLabel,
  title,
  children,
}: {
  href?: string
  disabled?: boolean
  ariaLabel: string
  title: string
  children: React.ReactNode
}) {
  const classes = cn(
    buttonVariants({ variant: 'outline', size: 'icon-sm' }),
    'aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground aria-[current=page]:border-primary',
    disabled && 'pointer-events-none opacity-50'
  )

  if (disabled || !href) {
    return (
      <span
        aria-label={ariaLabel}
        title={title}
        aria-disabled="true"
        className={classes}
      >
        {children}
      </span>
    )
  }

  return (
    <Link href={href} aria-label={ariaLabel} title={title} className={classes}>
      {children}
    </Link>
  )
}

export function Pagination({ page, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null

  const temAnterior = page > 1
  const temProximo = page < totalPages
  const paginas = gerarPaginasVisiveis(page, totalPages)

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2"
    >
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        Página <span className="font-medium text-foreground">{page}</span> de{' '}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
        <BotaoPaginacao
          href={temAnterior ? construirHref(basePath, 1) : undefined}
          disabled={!temAnterior}
          ariaLabel="Primeira página"
          title="Primeira página"
        >
          <ChevronsLeft className="size-4" />
        </BotaoPaginacao>

        <BotaoPaginacao
          href={temAnterior ? construirHref(basePath, page - 1) : undefined}
          disabled={!temAnterior}
          ariaLabel="Página anterior"
          title="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </BotaoPaginacao>

        {paginas.map((p, idx) =>
          p === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-1 text-sm text-muted-foreground select-none"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Link
              key={p}
              href={construirHref(basePath, p)}
              aria-label={`Página ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                buttonVariants({ variant: p === page ? 'default' : 'outline', size: 'icon-sm' }),
                p === page && 'pointer-events-none'
              )}
            >
              {p}
            </Link>
          )
        )}

        <BotaoPaginacao
          href={temProximo ? construirHref(basePath, page + 1) : undefined}
          disabled={!temProximo}
          ariaLabel="Próxima página"
          title="Próxima página"
        >
          <ChevronRight className="size-4" />
        </BotaoPaginacao>

        <BotaoPaginacao
          href={temProximo ? construirHref(basePath, totalPages) : undefined}
          disabled={!temProximo}
          ariaLabel="Última página"
          title="Última página"
        >
          <ChevronsRight className="size-4" />
        </BotaoPaginacao>
      </div>
    </nav>
  )
}
