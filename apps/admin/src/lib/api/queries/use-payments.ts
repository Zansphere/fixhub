import { useQuery } from '@tanstack/react-query';

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
