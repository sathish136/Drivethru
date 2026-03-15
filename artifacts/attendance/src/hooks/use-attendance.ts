import { useQueryClient } from "@tanstack/react-query";
import {
  useGetTodayAttendance,
  useGetMonthlySheet,
  usePunchAttendance,
  useGetDashboardSummary,
  getGetTodayAttendanceQueryKey,
  getGetMonthlySheetQueryKey,
  getGetDashboardSummaryQueryKey,
  type GetTodayAttendanceParams,
  type GetMonthlySheetParams,
  type GetDashboardSummaryParams
} from "@workspace/api-client-react";

export function useDashboardSummary(params?: GetDashboardSummaryParams) {
  return useGetDashboardSummary(params);
}

export function useTodayAttendance(params?: GetTodayAttendanceParams) {
  return useGetTodayAttendance(params);
}

export function useMonthlySheet(params: GetMonthlySheetParams) {
  return useGetMonthlySheet(params);
}

export function usePunch() {
  const queryClient = useQueryClient();
  
  return usePunchAttendance({
    mutation: {
      onSuccess: () => {
        // Invalidate attendance queries
        queryClient.invalidateQueries({ queryKey: [getGetTodayAttendanceQueryKey()[0]] });
        queryClient.invalidateQueries({ queryKey: [getGetDashboardSummaryQueryKey()[0]] });
        queryClient.invalidateQueries({ queryKey: [getGetMonthlySheetQueryKey()[0]] });
      }
    }
  });
}
