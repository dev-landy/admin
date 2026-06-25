import { useQuery } from "@tanstack/react-query";
import { fetchFeedbacks } from "./api";

export function useFeedbacks(params: { page?: number; size?: number }) {
  return useQuery({
    queryKey: ["feedbacks", params],
    queryFn: () => fetchFeedbacks(params),
  });
}
