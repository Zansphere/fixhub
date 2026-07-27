'use client';

import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { usePricingRules, useCreatePricingRule, useUpdatePricingRule, useDeletePricingRule } from '@/lib/api/queries/use-pricing';
import type { PricingRule } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Badge, Button, Dialog } from '@/components/ui';
import { DataTable } from '@/components/data-table/data-table';
import { toast } from 'sonner';

function PricingRuleDialog({
  open,
  onClose,
  rule,
}: {
  open: boolean;
  onClose: () => void;
  rule?: PricingRule | null;
}) {
  const [label, setLabel] = React.useState('');
  const [baseFee, setBaseFee] = React.useState('');
  const [taxPercent, setTaxPercent] = React.useState('');
  const [cancellationFeePercent, setCancellationFeePercent] = React.useState('');
  const [cancellationWindowMins, setCancellationWindowMins] = React.useState('');

  const createMutation = useCreatePricingRule();
  const updateMutation = useUpdatePricingRule();

  React.useEffect(() => {
    if (open) {
      setLabel(rule?.label ?? '');
      setBaseFee(rule?.baseFee ? String(rule.baseFee) : '');
      setTaxPercent(rule?.taxPercent ? String(rule.taxPercent) : '');
      setCancellationFeePercent(rule?.cancellationFeePercent ? String(rule.cancellationFeePercent) : '');
      setCancellationWindowMins(rule?.cancellationWindowMins ? String(rule.cancellationWindowMins) : '');
    }
  }, [open, rule]);

  const handleSave = () => {
    if (!label.trim() || !baseFee || !taxPercent) {
      return toast.error('Label, Base Fee, and Tax % are required');
    }

    const payload = {
      label: label.trim(),
      baseFee: Number(baseFee),
      taxPercent: Number(taxPercent),
      cancellationFeePercent: cancellationFeePercent ? Number(cancellationFeePercent) : undefined,
      cancellationWindowMins: cancellationWindowMins ? Number(cancellationWindowMins) : undefined,
    };

    if (rule) {
      updateMutation.mutate(
        { id: rule.id, payload },
        {
          onSuccess: () => {
            toast.success('Pricing rule updated');
            onClose();
          },
          onError: () => toast.error('Failed to update pricing rule'),
        }
      );
    } else {
      createMutation.mutate(
        payload,
        {
          onSuccess: () => {
            toast.success('Pricing rule created');
            onClose();
          },
          onError: () => toast.error('Failed to create pricing rule'),
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} title={rule ? 'Edit Pricing Rule' : 'New Pricing Rule'}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-[#374151] mb-1 block">Label</label>
          <input
            type="text"
            className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
            placeholder="Default Tier"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#374151] mb-1 block">Base Fee (in cents)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
              placeholder="e.g. 5000 for $50"
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#374151] mb-1 block">Tax %</label>
            <input
              type="number"
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
              placeholder="18"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#374151] mb-1 block">Cancel Fee % (Optional)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
              placeholder="10"
              value={cancellationFeePercent}
              onChange={(e) => setCancellationFeePercent(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#374151] mb-1 block">Cancel Window (Mins)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-[#E5E7EB] bg-[#F8F8F7] px-3 py-2 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6F7F5F33]"
              placeholder="120"
              value={cancellationWindowMins}
              onChange={(e) => setCancellationWindowMins(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={isPending}>
            {rule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export default function PricingPage() {
  const { data: rules, isLoading } = usePricingRules();
  const updateMutation = useUpdatePricingRule();
  const deleteMutation = useDeletePricingRule();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedRule, setSelectedRule] = React.useState<PricingRule | null>(null);

  const handleEdit = (rule: PricingRule) => {
    setSelectedRule(rule);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedRule(null);
    setDialogOpen(true);
  };

  const columns: ColumnDef<PricingRule, unknown>[] = [
    {
      id: 'label',
      header: 'Label',
      accessorKey: 'label',
      cell: ({ row }) => <span className="font-medium text-[#111827]">{row.original.label}</span>,
      size: 150,
    },
    {
      id: 'baseFee',
      header: 'Base Fee',
      cell: ({ row }) => <span className="text-[#374151]">{formatCurrency(row.original.baseFee)}</span>,
      size: 100,
    },
    {
      id: 'taxPercent',
      header: 'Tax %',
      cell: ({ row }) => <span className="text-[#374151]">{row.original.taxPercent}%</span>,
      size: 100,
    },
    {
      id: 'cancellation',
      header: 'Cancellation Settings',
      cell: ({ row }) => (
        <div className="text-xs text-[#6B7280]">
          Fee: {row.original.cancellationFeePercent ? `${row.original.cancellationFeePercent}%` : 'N/A'}<br/>
          Window: {row.original.cancellationWindowMins ? `${row.original.cancellationWindowMins} mins` : 'N/A'}
        </div>
      ),
      size: 200,
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
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const rule = row.original;
        return (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleEdit(rule)}
            >
              Edit
            </Button>
            <Button
              variant={rule.isActive ? 'secondary' : 'primary'}
              size="sm"
              onClick={() =>
                updateMutation.mutate(
                  { id: rule.id, payload: { isActive: !rule.isActive } },
                  { onSuccess: () => toast.success(rule.isActive ? 'Rule disabled' : 'Rule enabled') }
                )
              }
            >
              {rule.isActive ? 'Disable' : 'Enable'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this pricing rule?')) {
                  deleteMutation.mutate(rule.id, {
                    onSuccess: () => toast.success('Rule deleted'),
                    onError: () => toast.error('Failed to delete rule'),
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

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Pricing Rules</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Manage platform pricing, base fees, and tax percentages
          </p>
        </div>
        <Button variant="primary" onClick={handleNew}>
          New Pricing Rule
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={rules ?? []}
        loading={isLoading}
      />

      <PricingRuleDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        rule={selectedRule}
      />
    </div>
  );
}
