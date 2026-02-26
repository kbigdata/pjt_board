import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sprintsApi } from '@/api/sprints';

export function useSprints(boardId: string | undefined) {
  const queryClient = useQueryClient();

  const sprintsQuery = useQuery({
    queryKey: ['sprints', boardId],
    queryFn: () => sprintsApi.list(boardId!),
    enabled: !!boardId,
  });

  const activeSprintQuery = useQuery({
    queryKey: ['sprints', boardId, 'active'],
    queryFn: () => sprintsApi.getActive(boardId!),
    enabled: !!boardId,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; goal?: string; startDate: string; endDate: string }) =>
      sprintsApi.create(boardId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; goal?: string; startDate?: string; endDate?: string };
    }) => sprintsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId, 'active'] });
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => sprintsApi.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId, 'active'] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => sprintsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => sprintsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId, 'active'] });
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  const addCardsMutation = useMutation({
    mutationFn: ({ sprintId, cardIds }: { sprintId: string; cardIds: string[] }) =>
      sprintsApi.addCards(sprintId, cardIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  const removeCardsMutation = useMutation({
    mutationFn: ({ sprintId, cardIds }: { sprintId: string; cardIds: string[] }) =>
      sprintsApi.removeCards(sprintId, cardIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', boardId] });
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  return {
    sprints: sprintsQuery.data ?? [],
    activeSprint: activeSprintQuery.data ?? null,
    isLoading: sprintsQuery.isLoading,
    createSprint: createMutation.mutate,
    updateSprint: updateMutation.mutate,
    startSprint: startMutation.mutate,
    completeSprint: completeMutation.mutate,
    cancelSprint: cancelMutation.mutate,
    addCards: addCardsMutation.mutate,
    removeCards: removeCardsMutation.mutate,
  };
}

export function useSprintProgress(sprintId: string | undefined) {
  return useQuery({
    queryKey: ['sprints', sprintId, 'progress'],
    queryFn: () => sprintsApi.getProgress(sprintId!),
    enabled: !!sprintId,
    refetchInterval: 30000,
  });
}
