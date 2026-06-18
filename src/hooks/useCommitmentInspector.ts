import { useQuery } from "@tanstack/react-query";
import { getCommitmentInspectorBundle } from "@/lib/commitmentInspectorDb";

export function useCommitmentInspector(commitmentId?: string) {
  const query = useQuery({
    queryKey: ["commitment-inspector", commitmentId],
    enabled: Boolean(commitmentId),
    queryFn: async () => getCommitmentInspectorBundle(commitmentId as string),
  });

  return {
    ...query,
    isNotFound: Boolean(commitmentId) && !query.isLoading && !query.isError && query.data === null,
  };
}
