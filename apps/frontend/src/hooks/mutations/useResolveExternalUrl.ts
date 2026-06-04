import { useMutation } from "@tanstack/react-query";
import {
  externalUrlService,
  ResolveExternalUrlParams,
  ResolvedExternalUrl,
} from "@/services/external-url.service";

export const useResolveExternalUrl = () => {
  return useMutation<ResolvedExternalUrl, Error, ResolveExternalUrlParams>({
    mutationFn: (params: ResolveExternalUrlParams) => externalUrlService.resolve(params),
  });
};
