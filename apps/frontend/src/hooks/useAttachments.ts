import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentsApi } from '@/api/attachments';

export function useAttachments(cardId: string) {
  const queryClient = useQueryClient();

  const attachmentsQuery = useQuery({
    queryKey: ['attachments', cardId],
    queryFn: () => attachmentsApi.list(cardId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(cardId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', cardId] });
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attachmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', cardId] });
      queryClient.invalidateQueries({ queryKey: ['card', cardId] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
  });

  return {
    attachments: attachmentsQuery.data ?? [],
    isLoading: attachmentsQuery.isLoading,
    upload: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deleteAttachment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
