import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useBarbers,
  useBarbershops,
  useClients,
  useCreateReservation,
  useDeleteReservation,
  useReservations,
  useServices,
  useUpdateReservation,
  useUpdateReservationStatus,
} from '@/hooks/useResources'
import { getErrorMessage, getValidationErrors } from '@/lib/api'
import { formatCurrency, formatDateTime, STATUS_CONFIG } from '@/lib/format'
import { RESERVATION_STATUSES } from '@/types/api'
import type { Reservation, ReservationStatus } from '@/types/api'

interface FormState {
  barbershop_id: string
  barber_id: string
  client_id: string
  service_ids: number[]
  scheduled_date: string
  scheduled_time: string
  notes: string
}

const EMPTY_FORM: FormState = {
  barbershop_id: '',
  barber_id: '',
  client_id: 'walk-in',
  service_ids: [],
  scheduled_date: '',
  scheduled_time: '',
  notes: '',
}

export default function ReservationsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [shopFilter, setShopFilter] = useState<string>('all')
  const [barberFilter, setBarberFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data: shops } = useBarbershops()
  const { data: filterBarbers } = useBarbers(
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
  const deleteMutation = useDeleteReservation()
  const createMutation = useCreateReservation()
  const updateMutation = useUpdateReservation()

  // ----- Diálogo crear/editar -----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Reservation | null>(null)

  // Datos dependientes de la barbería seleccionada en el formulario
  const formShopId = form.barbershop_id !== '' ? Number(form.barbershop_id) : undefined
  const { data: formBarbers } = useBarbers(formShopId ? { barbershop_id: formShopId } : undefined)
  const { data: formServices } = useServices(
    formShopId ? { barbershop_id: formShopId } : undefined,
  )
  const { data: clients } = useClients()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(reservation: Reservation) {
    setEditing(reservation)
    const dt = new Date(reservation.scheduled_at)
    setForm({
      barbershop_id: reservation.barbershop ? String(reservation.barbershop.id) : '',
      barber_id: reservation.barber ? String(reservation.barber.id) : '',
      client_id: reservation.client ? String(reservation.client.id) : 'walk-in',
      service_ids: (reservation.services ?? []).map((s) => s.id),
      scheduled_date: toLocalInputDate(dt),
      scheduled_time: toLocalInputTime(dt),
      notes: reservation.notes ?? '',
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})

    const scheduledAt = `${form.scheduled_date}T${form.scheduled_time}:00`
    const payload: Record<string, unknown> = {
      scheduled_at: scheduledAt,
      notes: form.notes || null,
      service_ids: form.service_ids,
    }

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload })
        toast.success(`Reserva #${editing.id} actualizada`)
      } else {
        await createMutation.mutateAsync({
          ...payload,
          barbershop_id: Number(form.barbershop_id),
          barber_id: Number(form.barber_id),
          client_id: form.client_id !== 'walk-in' ? Number(form.client_id) : null,
        })
        toast.success('Reserva creada')
      }
      setDialogOpen(false)
    } catch (err) {
      const validation = getValidationErrors(err)
      if (Object.keys(validation).length > 0) {
        setErrors(remapErrorFields(validation))
        toast.error('Revisa los campos marcados')
      } else {
        toast.error(getErrorMessage(err))
      }
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteMutation.mutateAsync(toDelete.id)
      toast.success(`Reserva #${toDelete.id} eliminada`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setToDelete(null)
    }
  }

  async function handleStatusChange(reservation: Reservation, status: ReservationStatus) {
    try {
      await updateStatus.mutateAsync({ id: reservation.id, status })
      toast.success(`Reserva #${reservation.id} → ${STATUS_CONFIG[status].label}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  function toggleService(id: number, checked: boolean) {
    setForm((f) => ({
      ...f,
      service_ids: checked
        ? [...f.service_ids, id]
        : f.service_ids.filter((sid) => sid !== id),
    }))
  }

  const selectedServices = useMemo(
    () => (formServices?.data ?? []).filter((s) => form.service_ids.includes(s.id)),
    [formServices, form.service_ids],
  )
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0)
  const totalPrice = selectedServices.reduce((acc, s) => acc + Number(s.price), 0)

  const meta = data?.meta

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservas</h1>
          <p className="text-sm text-muted-foreground">
            Consulta, filtra y actualiza el estado de las citas
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nueva reserva
        </Button>
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
            {filterBarbers?.data.map((barber) => (
              <SelectItem key={barber.id} value={String(barber.id)}>
                {barber.user?.name ?? `Barbero #${barber.id}`}
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
              <Button variant="outline" onClick={openCreate} className="mt-2">
                <Plus className="mr-2 size-4" />
                Crear reserva
              </Button>
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
                      const editable =
                        reservation.status === 'pending' || reservation.status === 'confirmed'
                      return (
                        <TableRow key={reservation.id}>
                          <TableCell className="font-medium">#{reservation.id}</TableCell>
                          <TableCell>{reservation.client?.full_name ?? 'Walk-in'}</TableCell>
                          <TableCell>
                            {reservation.barber?.user?.name ?? `#${reservation.barber?.id ?? '—'}`}
                          </TableCell>
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
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEdit(reservation)}
                                disabled={!editable}
                                title={
                                  editable
                                    ? 'Editar reserva'
                                    : 'Solo se pueden editar reservas pendientes o confirmadas'
                                }
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setToDelete(reservation)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                            <Select
                              value={reservation.status}
                              onValueChange={(v) =>
                                handleStatusChange(reservation, v as ReservationStatus)
                              }
                              disabled={updateStatus.isPending}
                            >
                              <SelectTrigger className="mt-1 h-8 w-36">
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

      {/* ----- Diálogo crear/editar ----- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar reserva #${editing.id}` : 'Nueva reserva'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualiza fecha/hora, servicios y notas. El total se recalcula automáticamente.'
                : 'Selecciona barbería, barbero, cliente (opcional), servicios y fecha.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barbershop_id">Barbería</Label>
                <Select
                  value={form.barbershop_id}
                  onValueChange={(v) =>
                    setForm({ ...form, barbershop_id: v, barber_id: '', service_ids: [] })
                  }
                  disabled={!!editing}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops?.data.map((shop) => (
                      <SelectItem key={shop.id} value={String(shop.id)}>
                        {shop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.barbershop_id && (
                  <p className="text-xs text-destructive">{errors.barbershop_id}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="barber_id">Barbero</Label>
                <Select
                  value={form.barber_id}
                  onValueChange={(v) => setForm({ ...form, barber_id: v })}
                  disabled={!!editing || !form.barbershop_id}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formBarbers?.data ?? [])
                      .filter((b) => b.is_active)
                      .map((barber) => (
                        <SelectItem key={barber.id} value={String(barber.id)}>
                          {barber.user?.name ?? `Barbero #${barber.id}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.barber_id && <p className="text-xs text-destructive">{errors.barber_id}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm({ ...form, client_id: v })}
                disabled={!!editing}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Sin cliente (walk-in)</SelectItem>
                  {clients?.data.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-xs text-destructive">{errors.client_id}</p>}
            </div>

            <div className="space-y-2">
              <Label>Servicios</Label>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-3">
                {form.barbershop_id === '' ? (
                  <p className="text-sm text-muted-foreground">
                    Selecciona una barbería para ver sus servicios
                  </p>
                ) : (formServices?.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Esta barbería no tiene servicios activos
                  </p>
                ) : (
                  (formServices?.data ?? [])
                    .filter((s) => s.is_active)
                    .map((service) => (
                      <label
                        key={service.id}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded px-1 py-1.5 hover:bg-muted/50"
                      >
                        <span className="flex items-center gap-2">
                          <Checkbox
                            checked={form.service_ids.includes(service.id)}
                            onCheckedChange={(checked) => toggleService(service.id, !!checked)}
                          />
                          <span className="text-sm">{service.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {service.duration_minutes} min
                          </span>
                        </span>
                        <span className="text-sm font-medium">
                          {formatCurrency(service.price)}
                        </span>
                      </label>
                    ))
                )}
              </div>
              {(errors.service_ids || errors['service_ids.0']) && (
                <p className="text-xs text-destructive">
                  {errors.service_ids ?? errors['service_ids.0']}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Fecha</Label>
                <Input
                  id="scheduled_date"
                  type="date"
                  required
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_time">Hora</Label>
                <Input
                  id="scheduled_time"
                  type="time"
                  required
                  value={form.scheduled_time}
                  onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                />
                {(errors.scheduled_time || errors.scheduled_at) && (
                  <p className="text-xs text-destructive">
                    {errors.scheduled_time ?? errors.scheduled_at}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Preferencias del cliente, indicaciones…"
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
            </div>

            <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {form.service_ids.length} servicio(s) · {totalDuration} min
              </span>
              <span className="font-semibold">{formatCurrency(totalPrice)}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                )}
                {editing ? 'Guardar cambios' : 'Crear reserva'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ----- Confirmación de borrado ----- */}
      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la reserva
              {toDelete ? ` #${toDelete.id}` : ''} de{' '}
              {toDelete?.client?.full_name ?? 'cliente walk-in'} (
              {toDelete ? formatDateTime(toDelete.scheduled_at) : ''}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** yyyy-mm-dd en "hora de negocio" (UTC naive, para <input type="date">) */
function toLocalInputDate(dt: Date): string {
  const y = dt.getUTCFullYear()
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** HH:mm en "hora de negocio" (UTC naive, para <input type="time">) */
function toLocalInputTime(dt: Date): string {
  const h = String(dt.getUTCHours()).padStart(2, '0')
  const min = String(dt.getUTCMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

/** Remapea errores del backend a los nombres de campo del formulario */
function remapErrorFields(errors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [field, msg] of Object.entries(errors)) {
    if (field.startsWith('scheduled_at')) {
      out.scheduled_time = msg
    } else if (field === 'service_ids.0') {
      out['service_ids.0'] = msg
    } else {
      out[field] = msg
    }
  }
  return out
}
