import { LibraryScanResult } from "@spotiarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scanLibrary } from "@/services/library.service";
import { queryKeys } from "../queryKeys";

export const useScanLibraryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<LibraryScanResult, Error, void>({
    mutationFn: scanLibrary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.library });
    },
  });
};
