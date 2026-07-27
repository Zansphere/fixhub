import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PricingRule } from '@/lib/types';
import { apiClient } from '../client';
import { endpoints } from '../endpoints';

export function usePricingRules() {
  return useQuery({
    queryKey: ['pricing-rules'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: PricingRule[] }>(endpoints.admin.pricing);
      return data.data;
    },
  });
}

export function useCreatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      categoryId?: string;
      label: string;
      baseFee: number;
      taxPercent: number;
      cancellationFeePercent?: number;
      cancellationWindowMins?: number;
    }) => {
      const { data } = await apiClient.post(endpoints.admin.pricing, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
}

export function useUpdatePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: {
      id: string;
      payload: {
        label?: string;
        baseFee?: number;
        taxPercent?: number;
        cancellationFeePercent?: number;
        cancellationWindowMins?: number;
        isActive?: boolean;
      }
    }) => {
      const { data } = await apiClient.patch(endpoints.admin.pricingRule(id), payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
}

export function useDeletePricingRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(endpoints.admin.pricingRule(id));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
}
