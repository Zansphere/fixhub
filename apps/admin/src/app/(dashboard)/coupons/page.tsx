'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '@/lib/api/queries/use-coupons';
import type { Coupon } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge, Button, Dialog } from '@/components/ui';
import { DataTable } from '@/components/data-table/data-table';
import { toast } from 'sonner';

function CouponDialog({
  open,
  onClose,
  coupon,
}: {
  open: boolean;
  onClose: () => void;
  coupon?: Coupon | null;
}) {
  const [code, setCode] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [value, setValue] = React.useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = React.useState('');
  const [minOrderAmount, setMinOrderAmount] = React.useState('');
  const [firstBookingOnly, setFirstBookingOnly] = React.useState(false);
  const [maxUses, setMaxUses] = React.useState('');
  const [expiresAt, setExpiresAt] = React.useState('');

  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();

  React.useEffect(() => {
    if (open) {
      if (coupon) {
        setCode(coupon.code);
        setDescription(coupon.description ?? '');
        setType(coupon.type);
        setValue(String(coupon.value));
        setMaxDiscountAmount(coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : '');
        setMinOrderAmount(coupon.minOrderAmount ? String(coupon.minOrderAmount) : '');
        setFirstBookingOnly(coupon.firstBookingOnly ?? false);
        setMaxUses(coupon.maxUses ? String(coupon.maxUses) : '');
        setExpiresAt(coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : '');
      } else {
        setCode('');
        setDescription('');
        setType('PERCENTAGE');
        setValue('');
        setMaxDiscountAmount('');
        setMinOrderAmount('');
        setFirstBookingOnly(false);
        setMaxUses('');
        setExpiresAt('');
      }
    }
  }, [open, coupon]);

  const handleSave = () => {
    if (!coupon && (!code.trim() || !value)) {
      return toast.error('Code and Value are required');
    }

    if (coupon) {
      updateMutation.mutate(
        { 
          id: coupon.id, 
          payload: { 
            description: description.trim(), 
            maxUses: maxUses ? Number(maxUses) : undefined, 
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined 
          } 
        },
        {
          onSuccess: () => {
            toast.success('Coupon updated');
            onClose();
          },
          onError: () => toast.error('Failed to update coupon'),
        }
      );
    } else {
      createMutation.mutate(
        {
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          type,
          value: Number(value),
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
          firstBookingOnly,
          maxUses: maxUses ? Number(maxUses) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
        {
          onSuccess: () => {
            toast.success('Coupon created');
            onClose();
          },
          onError: () => toast.error('Failed to create coupon'),
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={coupon ? 'Edit Coupon' : 'New Coupon'}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
        <div>
          <label className="text-sm font-medium text-[#374151] mb-1 block">Code</label>
          <input
            type="text"
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] uppercase focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
            placeholder="WELCOME25"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={!!coupon}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-[#374151] mb-1 block">Description</label>
          <input
            type="text"
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
            placeholder="25% off on first booking"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {!coupon && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#374151] mb-1 block">Type</label>
              <select
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
                value={type}
                onChange={(e) => setType(e.target.value as 'PERCENTAGE' | 'FLAT')}
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FLAT">Flat Amount</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#374151] mb-1 block">Value</label>
              <input
                type="number"
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
                placeholder={type === 'PERCENTAGE' ? "25" : "5000"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>
        )}
        {!coupon && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-[#374151] mb-1 block">Max Discount (cents)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
                placeholder="e.g. 5000"
                value={maxDiscountAmount}
                onChange={(e) => setMaxDiscountAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#374151] mb-1 block">Min Order (cents)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
                placeholder="e.g. 10000"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
              />
            </div>
          </div>
        )}
        {!coupon && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="firstBookingOnly"
              checked={firstBookingOnly}
              onChange={(e) => setFirstBookingOnly(e.target.checked)}
              className="rounded border-[#E5E7EB] text-[#2B2111] focus:ring-[#2B2111]"
            />
            <label htmlFor="firstBookingOnly" className="text-sm font-medium text-[#374151]">First booking only</label>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#374151] mb-1 block">Max Uses</label>
            <input
              type="number"
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
              placeholder="Leave empty for unlimited"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#374151] mb-1 block">Expires At</label>
            <input
              type="date"
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={isPending}>
            {coupon ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default function CouponsPage() {
  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(20);
  const { data, isLoading } = useCoupons({ page, limit });
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedCoupon, setSelectedCoupon] = React.useState<Coupon | null>(null);

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedCoupon(null);
    setDialogOpen(true);
  };

  const columns: ColumnDef<Coupon, unknown>[] = [
    {
      id: 'code',
      header: 'Code',
      accessorKey: 'code',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-[#111827]">{row.original.code}</span>
          <p className="text-[10px] text-[#6B7280] truncate w-32" title={row.original.description ?? undefined}>{row.original.description}</p>
        </div>
      ),
      size: 150,
    },
    {
      id: 'discount',
      header: 'Discount',
      cell: ({ row }) => {
        const c = row.original;
        const val = c.type === 'PERCENTAGE' ? `${c.value}%` : formatCurrency(c.value);
        return (
          <div>
            <span className="font-medium text-[#374151]">{val}</span>
            {c.maxDiscountAmount && <p className="text-[10px] text-[#6B7280]">Up to {formatCurrency(c.maxDiscountAmount)}</p>}
          </div>
        );
      },
      size: 120,
    },
    {
      id: 'conditions',
      header: 'Conditions',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="text-xs text-[#6B7280]">
            {c.minOrderAmount ? `Min: ${formatCurrency(c.minOrderAmount)}` : 'No min.'}<br/>
            {c.firstBookingOnly ? 'First booking only' : 'All bookings'}
          </div>
        );
      },
      size: 150,
    },
    {
      id: 'usage',
      header: 'Usage',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <span className="text-sm text-[#374151]">
            {c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : ''}
          </span>
        );
      },
      size: 100,
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
      id: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => (
        <span className="text-xs text-[#6B7280]">
          {row.original.expiresAt ? formatDate(row.original.expiresAt) : 'Never'}
        </span>
      ),
      size: 110,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleEdit(c)}
            >
              Edit
            </Button>
            <Button
              variant={c.isActive ? 'secondary' : 'primary'}
              size="sm"
              onClick={() =>
                updateMutation.mutate(
                  { id: c.id, payload: { isActive: !c.isActive } },
                  { onSuccess: () => toast.success(c.isActive ? 'Coupon disabled' : 'Coupon enabled') }
                )
              }
            >
              {c.isActive ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this coupon?')) {
                  deleteMutation.mutate(c.id, {
                    onSuccess: () => toast.success('Coupon deleted'),
                    onError: () => toast.error('Failed to delete coupon'),
                  });
                }
              }}
            >
              Delete
            </Button>
          </div>
        );
      },
      size: 250,
    },
  ];

  const pageCount = data?.meta ? Math.ceil(data.meta.total / limit) : 1;

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Coupons</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Manage promotional codes and discounts
          </p>
        </div>
        <Button variant="primary" onClick={handleNew}>
          New Coupon
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        totalItems={data?.meta?.total}
        page={page}
        pageSize={limit}
        pageCount={pageCount}
        onPageChange={setPage}
      />

      <CouponDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        coupon={selectedCoupon}
      />
    </div>
  );
}
