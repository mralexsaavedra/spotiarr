import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { queryKeys } from "../queryKeys";

export const useUnlockMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => authService.unlock(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.authSession });
    },
  });
};
