import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { logout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { CalendarDays, Users, FileSpreadsheet, Bell, LogOut, LayoutDashboard, Download, ImageDown } from 'lucide-react'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await getProfile()
  const isAdmin = profile.papel === 'admin'

  if (!profile.ativo) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CalendarDays className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold text-card-foreground">calendZip</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {isAdmin ? (
            <>
              <NavLink href="/admin" icon={<LayoutDashboard className="h-4 w-4" />}>
                Dashboard
              </NavLink>
              <NavLink href="/admin/calendarios" icon={<CalendarDays className="h-4 w-4" />}>
                Visualizar Calendários
              </NavLink>
              <NavLink href="/admin/usuarios" icon={<Users className="h-4 w-4" />}>
                Clientes e usuários
              </NavLink>
              <NavLink href="/admin/importar" icon={<FileSpreadsheet className="h-4 w-4" />}>
                Importar xlsx
              </NavLink>
              <NavLink href="/admin/exportar-xlsx" icon={<Download className="h-4 w-4" />}>
                Exportar xlsx
              </NavLink>
              <NavLink href="/admin/exportar-imagens" icon={<ImageDown className="h-4 w-4" />}>
                Exportar imagens
              </NavLink>
              <NavLink href="/admin/alteracoes" icon={<Bell className="h-4 w-4" />}>
                Alterações
              </NavLink>
            </>
          ) : (
            <>
              <NavLink href="/cliente" icon={<LayoutDashboard className="h-4 w-4" />}>
                Dashboard
              </NavLink>
              <NavLink href="/cliente/calendario" icon={<CalendarDays className="h-4 w-4" />}>
                Meu calendário
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-card-foreground">{profile.nome}</p>
            <p className="text-xs text-muted-foreground">{profile.email}</p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="outline" className="w-full justify-start gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {children}
    </Link>
  )
}
