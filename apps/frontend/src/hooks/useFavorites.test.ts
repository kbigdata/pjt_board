import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHookWithProviders, createTestQueryClient } from '@/test/test-utils';
import { waitFor } from '@testing-library/react';
import { useFavorites, useToggleFavorite } from './useFavorites';

vi.mock('@/api/boards', () => ({
  boardsApi: {
    getFavorites: vi.fn(),
    toggleFavorite: vi.fn(),
  },
}));

import { boardsApi } from '@/api/boards';

const mockedBoardsApi = vi.mocked(boardsApi);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFavorites', () => {
  it('should return favorites on success', async () => {
    const mockBoards = [
      { id: '1', title: 'Board A', workspaceId: 'w1', description: null, visibility: 'private', position: 0, createdById: 'u1', archivedAt: null, createdAt: '', updatedAt: '' },
      { id: '2', title: 'Board B', workspaceId: 'w1', description: null, visibility: 'private', position: 1, createdById: 'u1', archivedAt: null, createdAt: '', updatedAt: '' },
    ];
    mockedBoardsApi.getFavorites.mockResolvedValue(mockBoards);

    const { result } = renderHookWithProviders(() => useFavorites());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockBoards);
    expect(mockedBoardsApi.getFavorites).toHaveBeenCalledOnce();
  });

  it('should return empty array when no favorites', async () => {
    mockedBoardsApi.getFavorites.mockResolvedValue([]);

    const { result } = renderHookWithProviders(() => useFavorites());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it('should handle API error', async () => {
    mockedBoardsApi.getFavorites.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithProviders(() => useFavorites());

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe('useToggleFavorite', () => {
  it('should call toggleFavorite and invalidate favorites query', async () => {
    mockedBoardsApi.toggleFavorite.mockResolvedValue(undefined);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHookWithProviders(() => useToggleFavorite(), { queryClient });

    result.current.mutate('board-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedBoardsApi.toggleFavorite).toHaveBeenCalledWith('board-1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['favorites'] });
  });
});
