import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Pencil, Plus, Settings2, Trash2 } from 'lucide-react'
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
  useBarbershops,
  useCreateService,
  useDeleteService,
  useServices,
  useUpdateService,
} from '@/hooks/useResources'
import { getErrorMessage, getValidationErrors } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { Service } from '@/types/api'

interface FormState {
  barbershop_id: string
  name: string
  description: string
  duration_minutes: string
  price: string
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  barbershop_id: '',
  name: '',
  description: '',
  duration_minutes: '30',
  price: '',
  is_active: true,
}

export default function ServicesPage() {
  const [shopFilter, setShopFilter] = useState<string>('all')
  const { data, isLoading } = useServices(
    shopFilter !== 'all' ? { barbershop_id: Number(shopFilter) } : undefined,
  )
  const { data: shops } = useBarbershops()
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()
  const deleteMutation = useDeleteService()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<Service | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      barbershop_id: shopFilter !== 'all' ? shopFilter : '',
    })
    setErrors({})
    setDialogOpen(true)
  }

  function openEdit(service: Service) {
    setEditing(service)
    setForm({
      barbershop_id: String(service.barbershop_id),
      name: service.name,
      description: service.description ?? '',
      duration_minutes: String(service.duration_minutes),
      price: String(service.price),
      is_active: service.is_active,
    })
    setErrors({})
    setDialogOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrors({})
    const payload = {
      barbershop_id: Number(form.barbershop_id),
      name: form.name,
      description: form.description || null,
      duration_minutes: Number(form.duration_minutes),
      price: Number(form.price),
      is_active: form.is_active,
    }
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload })
        toast.success('Servicio actualizado')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Servicio creado')
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
      toast.success('Servicio eliminado')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servicios</h1>
          <p className="text-sm text-muted-foreground">Catálogo de servicios por barbería</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={shopFilter} onValueChange={setShopFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas las barberías" />
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
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Nuevo servicio
          </Button>
        </div>
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
              <Settings2 className="size-10 text-muted-foreground/50" />
              <p className="font-medium">Sin servicios</p>
              <p className="text-sm text-muted-foreground">
                Crea servicios para que los clientes puedan reservarlos
              </p>
              <Button variant="outline" onClick={openCreate} className="mt-2">
                <Plus className="mr-2 size-4" />
                Crear servicio
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Barbería</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{service.name}</p>
                        {service.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{service.barbershop?.name ?? `#${service.barbershop_id}`}</TableCell>
                    <TableCell>{service.duration_minutes} min</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(service.price)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? 'default' : 'outline'}>
                        {service.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(service)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setToDelete(service)}
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
            <DialogTitle>{editing ? 'Editar servicio' : 'Nuevo servicio'}</DialogTitle>
            <DialogDescription>Define nombre, duración y precio del servicio.</DialogDescription>
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
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Corte clásico"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Qué incluye el servicio"
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duración (min)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  min={5}
                  step={5}
                  required
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                />
                {errors.duration_minutes && (
                  <p className="text-xs text-destructive">{errors.duration_minutes}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="15.00"
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="is_active">Activo</Label>
                <p className="text-xs text-muted-foreground">Disponible para reservas</p>
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
            <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
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
