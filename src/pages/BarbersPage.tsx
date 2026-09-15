import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Pencil, Plus, Scissors, Trash2 } from 'lucide-react'
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
import type { Barber } from '@/types/api'

interface FormState {
  user_id: string
  barbershop_id: string
  specialties: string
  bio: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  user_id: '',
  barbershop_id: '',
  specialties: '',
  bio: '',
  is_active: true,
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

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(barber: Barber) {
    setEditing(barber)
    setForm({
      user_id: String(barber.user_id),
      barbershop_id: String(barber.barbershop_id),
      specialties: barber.specialties ?? '',
      bio: barber.bio ?? '',
      is_active: barber.is_active,
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    const payload = {
      user_id: Number(form.user_id),
      barbershop_id: Number(form.barbershop_id),
      specialties: form.specialties || null,
      bio: form.bio || null,
      is_active: form.is_active,
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload })
        toast.success('Barbero actualizado')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Barbero creado')
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
      toast.success('Barbero eliminado')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setToDelete(null)
    }
  }

  const shopName = (id: number) => shops?.data.find((s) => s.id === id)?.name ?? `#${id}`

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
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((barber) => (
                  <TableRow key={barber.id}>
                    <TableCell className="font-medium">#{barber.id}</TableCell>
                    <TableCell>Usuario #{barber.user_id}</TableCell>
                    <TableCell>{shopName(barber.barbershop_id)}</TableCell>
                    <TableCell>
                      {barber.specialties ? (
                        <div className="flex flex-wrap gap-1">
                          {barber.specialties
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean)
                            .map((s) => (
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar barbero' : 'Nuevo barbero'}</DialogTitle>
            <DialogDescription>
              Vincula un usuario existente como barbero de una sede.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barbershop_id">Barbería</Label>
              <Select
                value={form.barbershop_id}
                onValueChange={(v) => setForm({ ...form, barbershop_id: v })}
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
              {errors.barbershop_id && (
                <p className="text-xs text-destructive">{errors.barbershop_id}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_id">ID del usuario</Label>
              <Input
                id="user_id"
                type="number"
                min={1}
                required
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                placeholder="1"
              />
              {errors.user_id && <p className="text-xs text-destructive">{errors.user_id}</p>}
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
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                )}
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
              Esta acción no se puede deshacer. Se eliminará el perfil de barbero permanentemente.
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
