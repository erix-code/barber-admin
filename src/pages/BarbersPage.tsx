import { useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, LoaderCircle, Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
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
  useCreateBarber,
  useDeleteBarber,
  useUpdateBarber,
} from '@/hooks/useResources'
import { getErrorMessage, getValidationErrors } from '@/lib/api'
import { DAY_NAMES } from '@/lib/format'
import type { Barber } from '@/types/api'

interface ScheduleForm {
  id?: number
  day_of_week: number
  start_time: string
  end_time: string
}

interface UserForm {
  name: string
  last_name: string
  phone: string
  email: string
  password: string
}

interface FormState {
  user: UserForm
  barbershop_id: string
  specialties: string
  bio: string
  is_active: boolean
  schedules: ScheduleForm[]
}

const EMPTY_USER: UserForm = {
  name: '',
  last_name: '',
  phone: '',
  email: '',
  password: '',
}

const EMPTY_FORM: FormState = {
  user: EMPTY_USER,
  barbershop_id: '',
  specialties: '',
  bio: '',
  is_active: true,
  schedules: [],
}

/** "Corte clásico, Barba" -> ["Corte clásico", "Barba"] */
function parseSpecialties(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function fullName(u: { name: string; last_name?: string | null }): string {
  return [u.name, u.last_name].filter(Boolean).join(' ')
}

export default function BarbersPage() {
  const { data, isLoading } = useBarbers()
  const { data: shops } = useBarbershops()
  const createMutation = useCreateBarber()
  const updateMutation = useUpdateBarber()
  const deleteMutation = useDeleteBarber()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Barber | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Barber | null>(null)

  const shopName = (id: number) => shops?.data.find((s) => s.id === id)?.name ?? `#${id}`

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(barber: Barber) {
    setEditing(barber)
    setForm({
      user: {
        name: barber.user?.name ?? '',
        last_name: barber.user?.last_name ?? '',
        phone: barber.user?.phone ?? '',
        email: barber.user?.email ?? '',
        password: '',
      },
      barbershop_id: String(barber.barbershop_id),
      specialties: (barber.specialties ?? []).join(', '),
      bio: barber.bio ?? '',
      is_active: barber.is_active,
      schedules: (barber.schedules ?? []).map((s) => ({
        id: s.id,
        day_of_week: s.day_of_week,
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
      })),
    })
    setErrors({})
    setDialogOpen(true)
  }

  function addSchedule() {
    setForm((f) => ({
      ...f,
      schedules: [
        ...f.schedules,
        { day_of_week: 1, start_time: '09:00', end_time: '18:00' },
      ],
    }))
  }

  function updateSchedule(index: number, patch: Partial<ScheduleForm>) {
    setForm((f) => ({
      ...f,
      schedules: f.schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  function removeSchedule(index: number) {
    setForm((f) => ({ ...f, schedules: f.schedules.filter((_, i) => i !== index) }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    const specialties = parseSpecialties(form.specialties)
    const schedules = form.schedules.map(({ day_of_week, start_time, end_time }) => ({
      day_of_week,
      start_time,
      end_time,
    }))
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          user: {
            name: form.user.name,
            last_name: form.user.last_name || null,
            phone: form.user.phone || null,
            email: form.user.email,
          },
          specialties,
          bio: form.bio || null,
          is_active: form.is_active,
          schedules,
        })
        toast.success('Barbero actualizado')
      } else {
        await createMutation.mutateAsync({
          barbershop_id: Number(form.barbershop_id),
          user: {
            name: form.user.name,
            last_name: form.user.last_name || null,
            phone: form.user.phone || null,
            email: form.user.email,
            password: form.user.password,
          },
          specialties,
          bio: form.bio || null,
          is_active: form.is_active,
          schedules,
        })
        toast.success('Barbero creado con su usuario')
      }
      setDialogOpen(false)
    } catch (err) {
      const validation = getValidationErrors(err)
      if (Object.keys(validation).length > 0) {
        // Prefijos "user." de la API -> mapearlos a claves planas para el form
        const mapped: Record<string, string> = {}
        for (const [field, message] of Object.entries(validation)) {
          mapped[field.replace(/^user\./, '')] = message
        }
        setErrors(mapped)
      } else {
        toast.error(getErrorMessage(err))
      }
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteMutation.mutateAsync(toDelete.id)
      toast.success('Barbero eliminado')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setToDelete(null)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barberos</h1>
          <p className="text-sm text-muted-foreground">Gestiona el personal de cada sede</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nuevo barbero
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Scissors className="size-10 text-muted-foreground/50" />
              <p className="font-medium">Sin barberos aún</p>
              <p className="text-sm text-muted-foreground">
                Registra barberos y asígnalos a una barbería
              </p>
              <Button variant="outline" onClick={openCreate} className="mt-2">
                <Plus className="mr-2 size-4" />
                Crear barbero
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Barbería</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((barber) => {
                  const dayCount = new Set(
                    (barber.schedules ?? []).map((s) => s.day_of_week),
                  ).size
                  return (
                    <TableRow key={barber.id}>
                      <TableCell className="font-medium">#{barber.id}</TableCell>
                      <TableCell>
                        <p className="font-medium leading-none">
                          {barber.user ? fullName(barber.user) : `Usuario #${barber.user_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {barber.user?.email ?? ''}
                        </p>
                      </TableCell>
                      <TableCell>{shopName(barber.barbershop_id)}</TableCell>
                      <TableCell>
                        {barber.specialties && barber.specialties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {barber.specialties.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {dayCount > 0 ? (
                          <Badge variant="outline" className="whitespace-nowrap">
                            <CalendarClock className="mr-1 size-3" />
                            {dayCount} {dayCount === 1 ? 'día' : 'días'}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={barber.is_active ? 'default' : 'outline'}>
                          {barber.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(barber)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setToDelete(barber)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar barbero' : 'Nuevo barbero'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualiza los datos del usuario, especialidades, estado y horario.'
                : 'Se creará un usuario con rol barbero junto con el perfil del barbero.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3 rounded-md border p-3">
                <p className="text-sm font-medium">Datos del usuario</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="user_name">Nombre</Label>
                    <Input
                      id="user_name"
                      required
                      value={form.user.name}
                      onChange={(e) =>
                        setForm({ ...form, user: { ...form.user, name: e.target.value } })
                      }
                      placeholder="Juan"
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="user_last_name">Apellido</Label>
                    <Input
                      id="user_last_name"
                      value={form.user.last_name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          user: { ...form.user, last_name: e.target.value },
                        })
                      }
                      placeholder="Pérez"
                    />
                    {errors.last_name && (
                      <p className="text-xs text-destructive">{errors.last_name}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="user_email">Email</Label>
                    <Input
                      id="user_email"
                      type="email"
                      required
                      value={form.user.email}
                      onChange={(e) =>
                        setForm({ ...form, user: { ...form.user, email: e.target.value } })
                      }
                      placeholder="barbero@correo.com"
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="user_phone">Teléfono</Label>
                    <Input
                      id="user_phone"
                      value={form.user.phone}
                      onChange={(e) =>
                        setForm({ ...form, user: { ...form.user, phone: e.target.value } })
                      }
                      placeholder="+51 987 654 321"
                    />
                    {errors.phone && (
                      <p className="text-xs text-destructive">{errors.phone}</p>
                    )}
                  </div>
                </div>
                {!editing && (
                  <div className="space-y-1.5">
                    <Label htmlFor="user_password">Contraseña</Label>
                    <Input
                      id="user_password"
                      type="password"
                      required
                      minLength={8}
                      value={form.user.password}
                      onChange={(e) =>
                        setForm({ ...form, user: { ...form.user, password: e.target.value } })
                      }
                      placeholder="Mínimo 8 caracteres"
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                )}
                {editing && (
                  <p className="text-xs text-muted-foreground">
                    Para cambiar la contraseña, usa el módulo de Usuarios.
                  </p>
                )}
              </div>

            <div className="space-y-2">
              <Label htmlFor="barbershop_id">Barbería</Label>
              <Select
                value={form.barbershop_id}
                onValueChange={(v) => setForm({ ...form, barbershop_id: v })}
                disabled={!!editing}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una barbería" />
                </SelectTrigger>
                <SelectContent>
                  {shops?.data.map((shop) => (
                    <SelectItem key={shop.id} value={String(shop.id)}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editing && (
                <p className="text-xs text-muted-foreground">
                  La barbería no se puede cambiar después de crear el barbero.
                </p>
              )}
              {errors.barbershop_id && (
                <p className="text-xs text-destructive">{errors.barbershop_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialties">Especialidades (separadas por coma)</Label>
              <Input
                id="specialties"
                value={form.specialties}
                onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                placeholder="Corte clásico, Barba, Afeitado"
              />
              {errors.specialties && (
                <p className="text-xs text-destructive">{errors.specialties}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Breve descripción del barbero"
              />
              {errors.bio && <p className="text-xs text-destructive">{errors.bio}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="schedules">Horario semanal</Label>
                <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
                  <Plus className="mr-1 size-3.5" />
                  Añadir bloque
                </Button>
              </div>
              {form.schedules.length === 0 ? (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Sin horarios. Añade bloques para definir los días y horas de atención.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.schedules.map((schedule, index) => (
                    <div
                      key={schedule.id ?? `new-${index}`}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <Select
                        value={String(schedule.day_of_week)}
                        onValueChange={(v) =>
                          updateSchedule(index, { day_of_week: Number(v) })
                        }
                      >
                        <SelectTrigger className="w-32 shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_NAMES.map((name, day) => (
                            <SelectItem key={day} value={String(day)}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        className="w-28"
                        value={schedule.start_time}
                        onChange={(e) =>
                          updateSchedule(index, { start_time: e.target.value })
                        }
                        required
                        aria-label="Hora de inicio"
                      />
                      <span className="text-xs text-muted-foreground">a</span>
                      <Input
                        type="time"
                        className="w-28"
                        value={schedule.end_time}
                        onChange={(e) => updateSchedule(index, { end_time: e.target.value })}
                        required
                        aria-label="Hora de fin"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto text-destructive hover:text-destructive"
                        onClick={() => removeSchedule(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {Object.entries(errors)
                .filter(([field]) => field.startsWith('schedules'))
                .map(([field, message]) => (
                  <p key={field} className="text-xs text-destructive">
                    {message}
                  </p>
                ))}
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="is_active">Activo</Label>
                <p className="text-xs text-muted-foreground">El barbero puede recibir reservas</p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <LoaderCircle className="mr-2 size-4 animate-spin" />}
                {editing ? 'Guardar cambios' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar barbero?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el perfil de barbero
              permanentemente.
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
