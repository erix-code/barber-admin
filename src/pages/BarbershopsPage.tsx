import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Pencil, Plus, Store, Trash2 } from 'lucide-react'
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
  useBarbershops,
  useCreateBarbershop,
  useDeleteBarbershop,
  useUpdateBarbershop,
} from '@/hooks/useResources'
import { getErrorMessage, getValidationErrors } from '@/lib/api'
import type { Barbershop } from '@/types/api'

interface FormState {
  name: string
  address: string
  phone: string
  opening_time: string
  closing_time: string
}

const EMPTY_FORM: FormState = {
  name: '',
  address: '',
  phone: '',
  opening_time: '09:00',
  closing_time: '20:00',
}

export default function BarbershopsPage() {
  const { data, isLoading } = useBarbershops()
  const createMutation = useCreateBarbershop()
  const updateMutation = useUpdateBarbershop()
  const deleteMutation = useDeleteBarbershop()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Barbershop | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Barbershop | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(shop: Barbershop) {
    setEditing(shop)
    setForm({
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      opening_time: (shop.opening_time ?? '').slice(0, 5),
      closing_time: (shop.closing_time ?? '').slice(0, 5),
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...form })
        toast.success('Barbería actualizada')
      } else {
        await createMutation.mutateAsync(form)
        toast.success('Barbería creada')
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
      toast.success('Barbería eliminada')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Barberías</h1>
          <p className="text-sm text-muted-foreground">Administra tus sedes</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Nueva barbería
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
              <Store className="size-10 text-muted-foreground/50" />
              <p className="font-medium">Sin barberías aún</p>
              <p className="text-sm text-muted-foreground">
                Crea tu primera barbería para empezar a gestionar
              </p>
              <Button variant="outline" onClick={openCreate} className="mt-2">
                <Plus className="mr-2 size-4" />
                Crear barbería
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.name}</TableCell>
                    <TableCell>{shop.address}</TableCell>
                    <TableCell>{shop.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(shop.opening_time ?? '').slice(0, 5)} –{' '}
                        {(shop.closing_time ?? '').slice(0, 5)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(shop)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDelete(shop)}
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
            <DialogTitle>{editing ? 'Editar barbería' : 'Nueva barbería'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualiza los datos de la sede.'
                : 'Registra una nueva sede para tu negocio.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Barbería Central"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Av. Principal 123"
              />
              {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+51 987 654 321"
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening_time">Apertura</Label>
                <Input
                  id="opening_time"
                  type="time"
                  required
                  value={form.opening_time}
                  onChange={(e) => setForm({ ...form, opening_time: e.target.value })}
                />
                {errors.opening_time && (
                  <p className="text-xs text-destructive">{errors.opening_time}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing_time">Cierre</Label>
                <Input
                  id="closing_time"
                  type="time"
                  required
                  value={form.closing_time}
                  onChange={(e) => setForm({ ...form, closing_time: e.target.value })}
                />
                {errors.closing_time && (
                  <p className="text-xs text-destructive">{errors.closing_time}</p>
                )}
              </div>
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
            <AlertDialogTitle>¿Eliminar barbería?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará "{toDelete?.name}" permanentemente.
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
