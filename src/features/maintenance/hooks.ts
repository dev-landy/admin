import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { OPERATIONAL_QUERY_OPTIONS } from '@/lib/query/query-policy';
import * as api from './api';
import type { Photo, ListParams, DeliveryInput, ResponseInput, ProcessingInput, CorrectionInput } from './types';
export const maintenanceKeys = {
  all: ['maintenance'] as const,
  list: (params: ListParams) => ['maintenance', 'list', params] as const,
  detail: (id: number) => ['maintenance', 'detail', id] as const,
  corrections: (id: number, page: number) => ['maintenance', 'corrections', id, page] as const,
  photoUrl: (id: number, photoId: number) => ['maintenance', 'photo-url', id, photoId] as const,
};
/** 서명 URL 만료 전에 미리 갱신해 화면의 사진이 끊기지 않게 한다. */
const PHOTO_URL_REFRESH_MARGIN_MS = 60_000;
const MIN_PHOTO_URL_REFRESH_MS = 5_000;
const untilRefresh = (expiresAt?: string) => {
  const expiry = expiresAt ? Date.parse(expiresAt) : NaN;
  return Number.isFinite(expiry) ? Math.max(MIN_PHOTO_URL_REFRESH_MS, expiry - Date.now() - PHOTO_URL_REFRESH_MARGIN_MS) : MIN_PHOTO_URL_REFRESH_MS;
};
export function usePhotoUrls(requestId: number, photos: Photo[]) {
  return useQueries({ queries: photos.map(photo => ({
    queryKey: maintenanceKeys.photoUrl(requestId, photo.photoId),
    queryFn: () => api.fetchPhotoUrl(requestId, photo.photoId),
    staleTime: (query: { state: { data?: { expiresAt: string } } }) => untilRefresh(query.state.data?.expiresAt),
    refetchInterval: (query: { state: { data?: { expiresAt: string } } }) => query.state.data ? untilRefresh(query.state.data.expiresAt) : false,
    retry: false,
  })) });
}
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
