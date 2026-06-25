import { useQuery } from "@tanstack/react-query";
import { fetchReleasePolicies } from "./api";

export function useReleasePolicies() {
  return useQuery({ queryKey: ["releasePolicies"], queryFn: fetchReleasePolicies });
}
