import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OPERATIONAL_QUERY_OPTIONS } from '@/lib/query/query-policy';
import * as api from './api';
import type { ListParams, DeliveryInput, ResponseInput, ProcessingInput, CorrectionInput } from './types';
export const maintenanceKeys = {
  all: ['maintenance'] as const,
  list: (params: ListParams) => ['maintenance', 'list', params] as const,
  detail: (id: number) => ['maintenance', 'detail', id] as const,
  corrections: (id: number, page: number) => ['maintenance', 'corrections', id, page] as const,
};
export function useRequests(params: ListParams) { return useQuery({ queryKey: maintenanceKeys.list(params), queryFn: () => api.fetchRequests(params), ...OPERATIONAL_QUERY_OPTIONS }); }
export function useRequest(id: number) { return useQuery({ queryKey: maintenanceKeys.detail(id), queryFn: () => api.fetchRequest(id), enabled: Number.isSafeInteger(id) && id > 0, ...OPERATIONAL_QUERY_OPTIONS }); }
export function useCorrections(id: number, page: number) { return useQuery({ queryKey: maintenanceKeys.corrections(id, page), queryFn: () => api.fetchCorrections(id, page), ...OPERATIONAL_QUERY_OPTIONS }); }
export type MaintenanceAction =
  | { type: 'delivery'; quoteId: number; body: DeliveryInput }
  | { type: 'response'; quoteId: number; body: ResponseInput }
  | { type: 'correction'; quoteId: number; body: CorrectionInput }
  | { type: 'requestProcessing'; body: ProcessingInput }
  | { type: 'quoteProcessing'; quoteId: number; body: ProcessingInput };
export function useMaintenanceMutation(requestId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (action: MaintenanceAction) => {
      switch (action.type) {
        case 'delivery': return api.recordDelivery(action.quoteId, action.body);
        case 'response': return api.recordResponse(action.quoteId, action.body);
        case 'correction': return api.correctResponse(action.quoteId, action.body);
        case 'requestProcessing': return api.updateRequestProcessing(requestId, action.body);
        case 'quoteProcessing': return api.updateQuoteProcessing(action.quoteId, action.body);
      }
    },
    retry: false,
    onSuccess: detail => { client.setQueryData(maintenanceKeys.detail(requestId), detail); },
    // Ambiguous failures and conflicts must re-read server state before another decision.
    onSettled: () => client.invalidateQueries({ queryKey: maintenanceKeys.all }),
  });
}
