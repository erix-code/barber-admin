import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings2,
  Users,
  Store,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/barbershops', label: 'Barberías', icon: Store },
  { to: '/barbers', label: 'Barberos', icon: Scissors },
  { to: '/services', label: 'Servicios', icon: Settings2 },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/reservations', label: 'Reservas', icon: CalendarDays },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const role = user?.roles?.[0]?.name

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 flex-col border-r bg-card md:flex">
        <div className="flex items-center gap-2 px-4 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Barber Admin</p>
            <p className="text-xs text-muted-foreground">Gestión de barberías</p>
          </div>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <Separator />
        <div className="flex items-center gap-3 p-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-none">{user?.name}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">{role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Navegación móvil */}
        <div className="flex items-center gap-1 overflow-x-auto border-b bg-card px-3 py-2 md:hidden">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`
              }
            >
              <Icon className="size-3.5" />
              {label}
            </NavLink>
          ))}
          <Button variant="ghost" size="icon" className="shrink-0" onClick={handleLogout}>
            <LogOut className="size-4" />
          </Button>
        </div>
        <main className="flex-1 overflow-x-hidden p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
