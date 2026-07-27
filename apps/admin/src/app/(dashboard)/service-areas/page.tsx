'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useServiceAreas, useCreateServiceArea, useUpdateServiceArea, useDeleteServiceArea, useCoverageRequests, useMarkCoverageHandled } from '@/lib/api/queries/use-service-areas';
import type { ServiceArea } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Badge, Button, Dialog, Input } from '@/components/ui';
import { DataTable, SortableHeader } from '@/components/data-table/data-table';

const areaSchema = z.object({
  name: z.string().min(2),
  pincode: z.string().length(6, 'Pincode must be 6 digits'),
  city: z.string().min(2),
  state: z.string().min(2),
  isActive: z.boolean(),
});
type AreaForm = z.infer<typeof areaSchema>;

import { useServices } from '@/lib/api/queries/use-services';

function AreaDialog({ open, onClose, editArea }: { open: boolean; onClose: () => void; editArea?: ServiceArea | null }) {
  const createMutation = useCreateServiceArea();
  const updateMutation = useUpdateServiceArea();
  const { data: services } = useServices();

  const [subServiceIds, setSubServiceIds] = React.useState<string[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AreaForm>({
    resolver: zodResolver(areaSchema),
    defaultValues: editArea
      ? { name: editArea.name, pincode: editArea.pincode, city: editArea.city, state: editArea.state, isActive: editArea.isActive }
      : { name: '', pincode: '', city: 'Chennai', state: 'Tamil Nadu', isActive: true },
  });

  React.useEffect(() => {
    if (open) {
      reset(
        editArea
          ? { name: editArea.name, pincode: editArea.pincode, city: editArea.city, state: editArea.state, isActive: editArea.isActive }
          : { name: '', pincode: '', city: 'Chennai', state: 'Tamil Nadu', isActive: true },
      );
      setSubServiceIds(editArea?.subServiceAreas?.map((a: any) => a.subServiceId) ?? []);
    }
  }, [open, editArea, reset]);

  const toggleService = (id: string) => {
    setSubServiceIds(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const onSubmit = (values: AreaForm) => {
    const payload = { ...values, subServiceIds };
    if (editArea) {
      updateMutation.mutate({ id: editArea.id, name: values.name, isActive: values.isActive, subServiceIds }, {
        onSuccess: () => { toast.success('Service area updated'); onClose(); },
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => { toast.success('Service area created'); onClose(); },
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={editArea ? 'Edit Service Area' : 'New Service Area'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Area Name" placeholder="e.g. Kolathur" error={errors.name?.message} {...register('name')} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Pincode" placeholder="600099" maxLength={6} error={errors.pincode?.message} {...register('pincode')} disabled={!!editArea} />
          <Input label="City" placeholder="Chennai" error={errors.city?.message} {...register('city')} disabled={!!editArea} />
        </div>
        <Input label="State" placeholder="Tamil Nadu" error={errors.state?.message} {...register('state')} disabled={!!editArea} />
        
        <div>
          <label className="text-sm font-medium text-[#374151] mb-2 block">Available Services</label>
          <div className="max-h-40 overflow-y-auto border border-[#E5E7EB] rounded-lg p-2 space-y-2 bg-[#F8F8F7]">
            {(!services || services.length === 0) ? (
              <p className="text-xs text-[#6B7280] p-2">No services found. (Will cover all services by default)</p>
            ) : (
              services.map(service => {
                const checked = subServiceIds.includes(service.id);
                const activeService = editArea?.subServiceAreas?.find((a: any) => a.subServiceId === service.id);
                const isSystemActive = activeService?.systemActive ?? false;

                return (
                  <label key={service.id} className="flex items-center gap-2 text-sm text-[#374151] cursor-pointer hover:bg-white p-1 rounded">
                    <input 
                      type="checkbox" 
                      checked={checked}
                      onChange={() => toggleService(service.id)}
                      className="rounded text-[#111827] focus:ring-[#111827]"
                    />
                    <span className="flex-1">{service.name}</span>
                    {checked && (
                      isSystemActive 
                        ? <Badge variant="success">Active</Badge> 
                        : <Badge variant="warning">Awaiting Techs</Badge>
                    )}
                  </label>
                );
              })
            )}
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1">If none selected, all active services are available in this area.</p>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="areaActive" {...register('isActive')} className="rounded" />
          <label htmlFor="areaActive" className="text-sm font-medium text-[#374151]">Active</label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
            {editArea ? 'Save Changes' : 'Create Area'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export default function ServiceAreasPage() {
  const [tab, setTab] = React.useState('areas');
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const { data, isLoading } = useServiceAreas({ page, limit });
  const { data: requestsData, isLoading: isLoadingRequests } = useCoverageRequests({ page, limit });
  
  const deleteMutation = useDeleteServiceArea();
  const markHandledMutation = useMarkCoverageHandled();
  
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editArea, setEditArea] = React.useState<ServiceArea | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<ServiceArea | null>(null);

  const columns: ColumnDef<ServiceArea, unknown>[] = [
    {
      id: 'area',
      header: 'Area',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-[#9CA3AF]" />
          <div>
            <p className="text-sm font-medium text-[#111827]">{row.original.name}</p>
            <p className="text-xs text-[#9CA3AF]">{row.original.pincode}</p>
          </div>
        </div>
      ),
      size: 200,
    },
    {
      id: 'city',
      header: 'City',
      accessorKey: 'city',
      cell: ({ row }) => <span className="text-sm text-[#374151]">{row.original.city}</span>,
      size: 130,
    },
    {
      id: 'state',
      header: 'State',
      cell: ({ row }) => <span className="text-sm text-[#374151]">{row.original.state}</span>,
      size: 130,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'neutral'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      size: 100,
    },
    {
      id: 'created',
      header: 'Added',
      cell: ({ row }) => <span className="text-xs text-[#9CA3AF]">{formatDate(row.original.createdAt)}</span>,
      size: 110,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditArea(row.original); setDialogOpen(true); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-[#EF4444] hover:bg-[#FEF2F2]" onClick={() => setDeleteConfirm(row.original)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      size: 80,
    },
  ];

  const requestColumns: ColumnDef<any, unknown>[] = [
    {
      id: 'location',
      header: 'Location Requested',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-[#111827]">{row.original.pincode}</p>
          {row.original.city && <p className="text-xs text-[#9CA3AF]">{row.original.city}</p>}
        </div>
      ),
      size: 200,
    },
    {
      id: 'customer',
      header: 'Customer Info',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-[#374151]">{row.original.phone}</p>
          {row.original.email && <p className="text-xs text-[#9CA3AF]">{row.original.email}</p>}
        </div>
      ),
      size: 200,
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isHandled ? 'success' : 'warning'}>
          {row.original.isHandled ? 'Handled' : 'Pending'}
        </Badge>
      ),
      size: 100,
    },
    {
      id: 'created',
      header: 'Requested On',
      cell: ({ row }) => <span className="text-xs text-[#9CA3AF]">{formatDate(row.original.createdAt)}</span>,
      size: 150,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          disabled={row.original.isHandled}
          loading={markHandledMutation.isPending}
          onClick={() => {
            markHandledMutation.mutate(row.original.id, {
              onSuccess: () => toast.success('Marked as handled'),
            });
          }}
        >
          {row.original.isHandled ? 'Handled' : 'Mark Handled'}
        </Button>
      ),
      size: 150,
    },
  ];

  const pageCount = data?.meta ? Math.ceil(data.meta.total / limit) : 1;
  const requestsPageCount = requestsData?.meta ? Math.ceil(requestsData.meta.total / limit) : 1;

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Service Areas</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            {tab === 'areas' ? `${data?.meta?.total ?? 0} coverage zones` : `${requestsData?.meta?.total ?? 0} coverage requests`}
          </p>
        </div>
        {tab === 'areas' && (
          <Button onClick={() => { setEditArea(null); setDialogOpen(true); }} leftIcon={<Plus className="h-4 w-4" />}>
            New Area
          </Button>
        )}
      </div>

      <div className="flex border-b border-[#E5E7EB]">
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === 'areas' ? 'border-b-2 border-[#111827] text-[#111827]' : 'text-[#6B7280]'}`}
          onClick={() => { setTab('areas'); setPage(1); }}
        >
          Service Areas
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === 'requests' ? 'border-b-2 border-[#111827] text-[#111827]' : 'text-[#6B7280]'}`}
          onClick={() => { setTab('requests'); setPage(1); }}
        >
          Coverage Requests
        </button>
      </div>

      {tab === 'areas' && (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          searchPlaceholder="Search areas..."
          totalItems={data?.meta?.total}
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          emptyTitle="No service areas"
          emptyDescription="Add service areas to define your coverage zones."
        />
      )}

      {tab === 'requests' && (
        <DataTable
          columns={requestColumns}
          data={requestsData?.items ?? []}
          loading={isLoadingRequests}
          searchPlaceholder="Search requests..."
          totalItems={requestsData?.meta?.total}
          page={page}
          pageCount={requestsPageCount}
          onPageChange={setPage}
          emptyTitle="No coverage requests"
          emptyDescription="When customers request service outside your active areas, they will appear here."
        />
      )}

      <AreaDialog open={dialogOpen} onClose={() => setDialogOpen(false)} editArea={editArea} />

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Service Area" description={`Delete "${deleteConfirm?.name}" (${deleteConfirm?.pincode})? Active bookings in this area may be affected.`}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id, { onSuccess: () => { toast.success('Area deleted'); setDeleteConfirm(null); } })}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
