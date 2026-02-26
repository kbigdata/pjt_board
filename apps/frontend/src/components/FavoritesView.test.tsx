import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor } from '@/test/test-utils';
import FavoritesView from './FavoritesView';

const mockNavigate = vi.fn();
const mockSetNavView = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/stores/ui', () => ({
  useUIStore: () => ({ setNavView: mockSetNavView }),
}));

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: vi.fn(),
}));

import { useFavorites } from '@/hooks/useFavorites';
const mockedUseFavorites = vi.mocked(useFavorites);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FavoritesView', () => {
  it('should show loading state', () => {
    mockedUseFavorites.mockReturnValue({
      data: [],
      isLoading: true,
      isSuccess: false,
      isError: false,
    } as ReturnType<typeof useFavorites>);

    renderWithProviders(<FavoritesView />);

    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('should show empty state when no favorites', () => {
    mockedUseFavorites.mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useFavorites>);

    renderWithProviders(<FavoritesView />);

    expect(screen.getByText('sidebar.noFavorites')).toBeInTheDocument();
  });

  it('should render board list', () => {
    mockedUseFavorites.mockReturnValue({
      data: [
        { id: '1', title: 'My Board', createdBy: { id: 'u1', name: 'Alice', avatarUrl: null }, workspaceId: 'w1', description: null, visibility: 'private', position: 0, createdById: 'u1', archivedAt: null, createdAt: '', updatedAt: '' },
        { id: '2', title: 'Team Board', createdBy: null, workspaceId: 'w1', description: null, visibility: 'private', position: 1, createdById: 'u1', archivedAt: null, createdAt: '', updatedAt: '' },
      ],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useFavorites>);

    renderWithProviders(<FavoritesView />);

    expect(screen.getByText('My Board')).toBeInTheDocument();
    expect(screen.getByText('Team Board')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should navigate and reset nav view on board click', async () => {
    mockedUseFavorites.mockReturnValue({
      data: [
        { id: 'b1', title: 'Clickable Board', workspaceId: 'w1', description: null, visibility: 'private', position: 0, createdById: 'u1', archivedAt: null, createdAt: '', updatedAt: '' },
      ],
      isLoading: false,
      isSuccess: true,
      isError: false,
    } as ReturnType<typeof useFavorites>);

    renderWithProviders(<FavoritesView />);

    const button = screen.getByText('Clickable Board');
    button.click();

    expect(mockSetNavView).toHaveBeenCalledWith('home');
    expect(mockNavigate).toHaveBeenCalledWith('/boards/b1');
  });
});
