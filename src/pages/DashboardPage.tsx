import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Scissors,
  Store,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import {
  useBarbers,
  useBarbershops,
  useReservations,
  useServices,
} from '@/hooks/useResources'
import { formatCurrency, formatDateTime, STATUS_CONFIG } from '@/lib/format'
import type { ReservationStatus } from '@/types/api'

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string
  value: string | number
  icon: typeof Store
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: shops, isLoading: shopsLoading } = useBarbershops()
  const { data: barbers, isLoading: barbersLoading } = useBarbers()
  const { data: services, isLoading: servicesLoading } = useServices()
  const { data: reservations, isLoading: reservationsLoading } = useReservations()

  const reservationList = reservations?.data ?? []
  const upcoming = reservationList.filter(
    (r) => r.status === 'pending' || r.status === 'confirmed',
  )
  const confirmedRevenue = reservationList
    .filter((r) => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + Number(r.total_price ?? 0), 0)

  const statusCounts = reservationList.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    },
    {} as Record<ReservationStatus, number>,
  )

  const isLoading =
    shopsLoading || barbersLoading || servicesLoading || reservationsLoading

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Hola, {user?.name?.split(' ')[0] ?? ''} 👋
        </h1>
        <p className="text-sm text-muted-foreground">Resumen general de tus barberías</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Barberías"
            value={shops?.meta.total ?? 0}
            icon={Store}
            hint={`${shops?.meta.total ?? 0} sedes registradas`}
          />
          <StatCard
            title="Barberos"
            value={barbers?.meta.total ?? 0}
            icon={Scissors}
            hint={`${barbers?.data.filter((b) => b.is_active).length ?? 0} activos`}
          />
          <StatCard
            title="Servicios"
            value={services?.meta.total ?? 0}
            icon={CheckCircle2}
            hint={`${services?.data.filter((s) => s.is_active).length ?? 0} disponibles`}
          />
          <StatCard
            title="Reservas próximas"
            value={upcoming.length}
            icon={CalendarClock}
            hint="Pendientes y confirmadas (página 1)"
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Próximas reservas</CardTitle>
          </CardHeader>
          <CardContent>
            {reservationsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <CalendarDays className="size-8 text-muted-foreground/50" />
                <p className="text-sm">No hay reservas próximas</p>
              </div>
            ) : (
              <ul className="divide-y">
                {upcoming.slice(0, 6).map((r) => {
                  const status = STATUS_CONFIG[r.status]
                  return (
                    <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {r.client?.full_name ?? 'Cliente'} ·{' '}
                          <span className="text-muted-foreground">
                            {r.services?.map((s) => s.name).join(', ') || 'Sin servicios'}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.barbershop?.name} · {formatDateTime(r.scheduled_at)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium">
                          {formatCurrency(r.total_price)}
                        </span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Reservas por estado</CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3">
              {(['pending', 'confirmed', 'completed', 'cancelled'] as ReservationStatus[]).map(
                (status) => (
                  <div key={status} className="flex items-center justify-between">
                    <Badge variant={STATUS_CONFIG[status].variant}>
                      {STATUS_CONFIG[status].label}
                    </Badge>
                    <span className="text-sm font-semibold">{statusCounts[status] ?? 0}</span>
                  </div>
                ),
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Ingresos confirmados</CardTitle>
              <Clock3 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(confirmedRevenue)}</p>
              <p className="text-xs text-muted-foreground">
                Confirmadas + completadas (página 1)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
