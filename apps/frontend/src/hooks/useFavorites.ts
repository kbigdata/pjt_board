import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardsApi } from '@/api/boards';

export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => boardsApi.getFavorites(),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => boardsApi.toggleFavorite(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
