import { apiClient } from '@/lib/api/client';
import type { AdminDetail, ListParams, ListResponse, DeliveryInput, ResponseInput, ProcessingInput, CorrectionInput, CorrectionList } from './types';
const requests = '/v1/admin/maintenance-requests';
const quotes = '/v1/admin/maintenance-quotes';
export async function fetchRequests(params: ListParams) { return (await apiClient.get<ListResponse>(requests, { params })).data; }
export async function fetchRequest(id: number) { return (await apiClient.get<AdminDetail>(`${requests}/${id}`)).data; }
export async function recordDelivery(id: number, body: DeliveryInput) { return (await apiClient.put<AdminDetail>(`${quotes}/${id}/delivery`, body)).data; }
export async function recordResponse(id: number, body: ResponseInput) { return (await apiClient.put<AdminDetail>(`${quotes}/${id}/response`, body)).data; }
export async function updateRequestProcessing(id: number, body: ProcessingInput) { return (await apiClient.patch<AdminDetail>(`${requests}/${id}/processing`, body)).data; }
export async function updateQuoteProcessing(id: number, body: ProcessingInput) { return (await apiClient.patch<AdminDetail>(`${quotes}/${id}/processing`, body)).data; }
export async function correctResponse(id: number, body: CorrectionInput) { return (await apiClient.post<AdminDetail>(`${quotes}/${id}/corrections`, body)).data; }
export async function fetchCorrections(id: number, page: number) { return (await apiClient.get<CorrectionList>(`${quotes}/${id}/corrections`, { params: { page, size: 20 } })).data; }
export async function fetchPhotoUrl(requestId: number, photoId: number) { return (await apiClient.get<{url: string; expiresAt: string}>(`${requests}/${requestId}/photos/${photoId}/view-url`)).data; }
