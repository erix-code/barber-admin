import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Pencil, Plus, Search, ShieldCheck, Trash2, Users } from 'lucide-react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from '@/hooks/useResources'
import { getErrorMessage, getValidationErrors } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { USER_ROLES } from '@/types/api'
import type { User, UserRole } from '@/types/api'

interface FormState {
  name: string
  last_name: string
  phone: string
  email: string
  password: string
  role: UserRole | ''
}

const EMPTY_FORM: FormState = {
  name: '',
  last_name: '',
  phone: '',
  email: '',
  password: '',
  role: '',
}

const ROLE_BADGE_VARIANT: Record<UserRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  admin: 'destructive',
  owner: 'default',
  barber: 'secondary',
  client: 'outline',
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  // El backend filtra por search/role; enviamos solo si tienen valor
  const queryFilters = {
    search: search || undefined,
    role: roleFilter === 'all' ? undefined : (roleFilter as UserRole),
  }
  const { data, isLoading } = useUsers(queryFilters)

  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<User | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setForm({
      name: user.name,
      last_name: user.last_name ?? '',
      phone: user.phone ?? '',
      email: user.email,
      password: '',
      role: user.roles[0]?.name as UserRole | undefined ?? '',
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    try {
      if (editing) {
        // password vacío => no cambiarla
        const payload: Record<string, unknown> = {
          name: form.name,
          last_name: form.last_name || null,
          phone: form.phone || null,
          email: form.email,
        }
        if (form.role) payload.role = form.role
        if (form.password) payload.password = form.password

        await updateMutation.mutateAsync({ id: editing.id, ...payload })
        toast.success('Usuario actualizado')
      } else {
        await createMutation.mutateAsync({
          name: form.name,
          last_name: form.last_name || null,
          phone: form.phone || null,
          email: form.email,
          password: form.password,
          role: form.role,
        })
        toast.success('Usuario creado')
      }
      setDialogOpen(false)
    } catch (err) {
      const validation = getValidationErrors(err)
      if (Object.keys(validation).length > 0) {
        setErrors(validation)
      } else {
        toast.error(getErrorMessage(err))
      }
    }
  }

  async function handleDelete() {
    if (!toDelete) return
    try {
      await deleteMutation.mutateAsync(toDelete.id)
      toast.success('Usuario eliminado')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setToDelete(null)
    }
  }

  const fullName = (u: User) => [u.name, u.last_name].filter(Boolean).join(' ')
  const initials = (u: User) =>
    fullName(u)
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Crea y gestiona usuarios con roles: admin, dueño, barbero y cliente
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email…"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {USER_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-10 text-muted-foreground/50" />
              <p className="font-medium">Sin usuarios</p>
              <p className="text-sm text-muted-foreground">
                No hay usuarios que coincidan con la búsqueda
              </p>
              <Button variant="outline" onClick={openCreate} className="mt-2">
                <Plus className="mr-2 size-4" />
                Crear usuario
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs">{initials(user)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-none">{fullName(user)}</p>
                          <p className="text-xs text-muted-foreground">#{user.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="leading-none">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.phone ?? '—'}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((r) => (
                          <Badge
                            key={r.id}
                            variant={ROLE_BADGE_VARIANT[r.name as UserRole] ?? 'outline'}
                          >
                            {USER_ROLES.find((ur) => ur.value === r.name)?.label ?? r.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.created_at ?? undefined)}
                    </TableCell>
                    <TableCell className="text-right">
                      {currentUser?.id === user.id ? (
                        <Badge variant="outline" className="mr-1">
                          <ShieldCheck className="mr-1 size-3" />
                          Tú
                        </Badge>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setToDelete(user)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualiza los datos o cambia el rol asignado.'
                : 'Crea un usuario y asígnale uno de los roles del sistema.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Juan"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Apellido</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Pérez"
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="usuario@correo.com"
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+51 987 654 321"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center gap-2">
                        <Badge variant={ROLE_BADGE_VARIANT[r.value]}>{r.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
              <p className="text-xs text-muted-foreground">
                <strong>Admin</strong>: acceso total · <strong>Dueño</strong>: gestiona sus
                barberías · <strong>Barbero</strong>: atiende reservas · <strong>Cliente</strong>:
                reserva servicios
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              </Label>
              <Input
                id="password"
                type="password"
                required={!editing}
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? 'Dejar vacío para mantener la actual' : 'Mínimo 8 caracteres'}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
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
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
          <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará a "{toDelete?.email}"
              permanentemente junto con sus datos asociados (barberos, barberías, reservas).
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
