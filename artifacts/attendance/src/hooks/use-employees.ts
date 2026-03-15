import { useQueryClient } from "@tanstack/react-query";
import { 
  useListEmployees, 
  useCreateEmployee, 
  useUpdateEmployee, 
  useDeleteEmployee,
  getListEmployeesQueryKey,
  type ListEmployeesParams,
  type CreateEmployeeRequest
} from "@workspace/api-client-react";

export function useEmployees(params?: ListEmployeesParams) {
  return useListEmployees(params);
}

export function useEmployeeMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [getListEmployeesQueryKey()[0]] });
  };

  const create = useCreateEmployee({ mutation: { onSuccess: invalidate } });
  const update = useUpdateEmployee({ mutation: { onSuccess: invalidate } });
  const remove = useDeleteEmployee({ mutation: { onSuccess: invalidate } });

  return { create, update, remove };
}
