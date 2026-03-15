import { useQueryClient } from "@tanstack/react-query";
import {
  useListBranches,
  useCreateBranch,
  useUpdateBranch,
  useDeleteBranch,
  useListShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useGetSettings,
  useUpdateSettings,
  getListBranchesQueryKey,
  getListShiftsQueryKey,
  getGetSettingsQueryKey
} from "@workspace/api-client-react";

export function useBranches() {
  return useListBranches();
}

export function useBranchMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [getListBranchesQueryKey()[0]] });
  
  return {
    create: useCreateBranch({ mutation: { onSuccess: invalidate } }),
    update: useUpdateBranch({ mutation: { onSuccess: invalidate } }),
    remove: useDeleteBranch({ mutation: { onSuccess: invalidate } })
  };
}

export function useShifts() {
  return useListShifts();
}

export function useShiftMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [getListShiftsQueryKey()[0]] });
  
  return {
    create: useCreateShift({ mutation: { onSuccess: invalidate } }),
    update: useUpdateShift({ mutation: { onSuccess: invalidate } }),
    remove: useDeleteShift({ mutation: { onSuccess: invalidate } })
  };
}

export function useSettings() {
  return useGetSettings();
}

export function useSettingsMutation() {
  const queryClient = useQueryClient();
  return useUpdateSettings({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [getGetSettingsQueryKey()[0]] })
    }
  });
}
