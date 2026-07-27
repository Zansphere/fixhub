import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PaginatedResponse } from '@/lib/types';
import { apiClient } from '../client';
import { endpoints } from '../endpoints';

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function usePayments(params?: PaymentQueryParams) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<any>>(endpoints.payments.list, {
        params,
      });
      return data.data;
    },
  });
}

export function useRefundPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, amount, reason }: { paymentId: string; amount?: number; reason?: string }) => {
      const { data } = await apiClient.post(endpoints.payments.refund(paymentId), { amount, reason });
      return data;
    },
    onSuccess: (_, { paymentId }) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}
