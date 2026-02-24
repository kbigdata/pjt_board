import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { swimlanesApi } from '@/api/swimlanes';

export function useSwimlanes(boardId: string | undefined) {
  const queryClient = useQueryClient();

  const swimlanesQuery = useQuery({
    queryKey: ['swimlanes', boardId],
    queryFn: () => swimlanesApi.list(boardId!),
    enabled: !!boardId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; color?: string }) =>
      swimlanesApi.create(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swimlanes', boardId] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      swimlanesApi.move(id, { position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swimlanes', boardId] });
    },
  });

  return {
    swimlanes: swimlanesQuery.data ?? [],
    isLoading: swimlanesQuery.isLoading,
    createSwimlane: createMutation.mutate,
    moveSwimlane: moveMutation.mutate,
  };
}
