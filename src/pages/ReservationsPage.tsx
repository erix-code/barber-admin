import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useBarbers,
  useBarbershops,
  useDeleteReservation,
  useReservations,
  useUpdateReservationStatus,
} from '@/hooks/useResources'
import { getErrorMessage } from '@/lib/api'
import { formatCurrency, formatDateTime, STATUS_CONFIG } from '@/lib/format'
import { RESERVATION_STATUSES } from '@/types/api'
import type { Reservation, ReservationStatus } from '@/types/api'

export default function ReservationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [shopFilter, setShopFilter] = useState<string>('all')
  const [barberFilter, setBarberFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data: shops } = useBarbershops()
  const { data: barbers } = useBarbers(
    shopFilter !== 'all' ? { barbershop_id: Number(shopFilter) } : undefined,
  )

  const filters = {
    ...(statusFilter !== 'all' ? { status: statusFilter as ReservationStatus } : {}),
    ...(shopFilter !== 'all' ? { barbershop_id: Number(shopFilter) } : {}),
    ...(barberFilter !== 'all' ? { barber_id: Number(barberFilter) } : {}),
    page,
  }

  const { data, isLoading, isFetching } = useReservations(filters)
  const updateStatus = useUpdateReservationStatus()
  const deleteReservation = useDeleteReservation()

  async function handleStatusChange(reservation: Reservation, status: ReservationStatus) {
    try {
      await updateStatus.mutateAsync({ id: reservation.id, status })
      toast.success(`Reserva #${reservation.id} → ${STATUS_CONFIG[status].label}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function handleDelete(reservation: Reservation) {
    try {
      await deleteReservation.mutateAsync(reservation.id)
      toast.success(`Reserva #${reservation.id} eliminada`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const meta = data?.meta

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reservas</h1>
        <p className="text-sm text-muted-foreground">
          Consulta, filtra y actualiza el estado de las citas
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {RESERVATION_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {STATUS_CONFIG[status].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={shopFilter}
          onValueChange={(v) => {
            setShopFilter(v)
            setBarberFilter('all')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Barbería" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las barberías</SelectItem>
            {shops?.data.map((shop) => (
              <SelectItem key={shop.id} value={String(shop.id)}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={barberFilter}
          onValueChange={(v) => {
            setBarberFilter(v)
            setPage(1)
          }}
          disabled={shopFilter === 'all'}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Barbero" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los barberos</SelectItem>
            {barbers?.data.map((barber) => (
              <SelectItem key={barber.id} value={String(barber.id)}>
                Barbero #{barber.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CalendarDays className="size-10 text-muted-foreground/50" />
              <p className="font-medium">Sin reservas</p>
              <p className="text-sm text-muted-foreground">
                No hay reservas que coincidan con los filtros
              </p>
            </div>
          ) : (
            <>
              <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Barbero</TableHead>
                      <TableHead>Barbería</TableHead>
                      <TableHead>Servicios</TableHead>
                      <TableHead>Fecha y hora</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.data.map((reservation) => {
                      const status = STATUS_CONFIG[reservation.status]
                      return (
                        <TableRow key={reservation.id}>
                          <TableCell className="font-medium">#{reservation.id}</TableCell>
                          <TableCell>{reservation.client?.full_name ?? '—'}</TableCell>
                          <TableCell>#{reservation.barber?.id ?? '—'}</TableCell>
                          <TableCell>{reservation.barbershop?.name ?? '—'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {reservation.services?.map((service) => (
                                <Badge key={service.id} variant="outline" className="text-xs">
                                  {service.name}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{formatDateTime(reservation.scheduled_at)}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(reservation.total_price)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={reservation.status}
                              onValueChange={(v) =>
                                handleStatusChange(reservation, v as ReservationStatus)
                              }
                              disabled={updateStatus.isPending}
                            >
                              <SelectTrigger className="h-8 w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {RESERVATION_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {STATUS_CONFIG[s].label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-1 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(reservation)}
                              disabled={deleteReservation.isPending}
                            >
                              Eliminar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {meta && meta.last_page > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {meta.current_page} de {meta.last_page} · {meta.total} reservas
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1 || isFetching}
                    >
                      <ChevronLeft className="mr-1 size-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                      disabled={page >= meta.last_page || isFetching}
                    >
                      Siguiente
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
