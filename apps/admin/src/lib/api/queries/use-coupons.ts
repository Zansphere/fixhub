import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Coupon, PaginatedResponse } from '@/lib/types';
import { apiClient } from '../client';
import { endpoints } from '../endpoints';

export function useCoupons(params?: { isActive?: boolean; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['coupons', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Coupon>>(
        endpoints.admin.coupons,
        { params },
      );
      return data.data;
    },
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      code: string;
      description?: string;
      type: 'PERCENTAGE' | 'FLAT';
      value: number;
      maxDiscountAmount?: number;
      minOrderAmount?: number;
      firstBookingOnly?: boolean;
      maxUses?: number;
      expiresAt?: string;
      categoryId?: string;
    }) => {
      const { data } = await apiClient.post(endpoints.admin.coupons, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: {
      id: string;
      payload: {
        description?: string;
        maxUses?: number;
        expiresAt?: string;
        isActive?: boolean;
      }
    }) => {
      const { data } = await apiClient.patch(endpoints.admin.coupon(id), payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(endpoints.admin.coupon(id));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] });
    },
  });
}
