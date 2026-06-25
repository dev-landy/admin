import { useQuery } from "@tanstack/react-query";
import { fetchPayments, fetchDuplicates } from "./api";
import type { PaymentsListParams } from "./types";

export const paymentKeys = {
  list: (p: PaymentsListParams) => ["payments", "list", p] as const,
  duplicates: (p: { page?: number; size?: number }) => ["payments", "duplicates", p] as const,
};

export function usePayments(params: PaymentsListParams) {
  return useQuery({ queryKey: paymentKeys.list(params), queryFn: () => fetchPayments(params) });
}

export function useDuplicates(params: { page?: number; size?: number }) {
  return useQuery({ queryKey: paymentKeys.duplicates(params), queryFn: () => fetchDuplicates(params) });
}
