import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, waitFor, userEvent } from '@/test/test-utils';
import SearchView from './SearchView';

const mockNavigate = vi.fn();
const mockSetNavView = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/stores/ui', () => ({
  useUIStore: () => ({ setNavView: mockSetNavView }),
}));

vi.mock('@/api/workspaces', () => ({
  workspacesApi: {
    list: vi.fn(),
  },
}));

vi.mock('@/api/boards', () => ({
  boardsApi: {
    list: vi.fn(),
  },
}));

import { workspacesApi } from '@/api/workspaces';
import { boardsApi } from '@/api/boards';

const mockedWorkspacesApi = vi.mocked(workspacesApi);
const mockedBoardsApi = vi.mocked(boardsApi);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });

  mockedWorkspacesApi.list.mockResolvedValue([
    { id: 'w1', name: 'Workspace 1', slug: 'ws1', description: null, ownerId: 'u1', createdAt: '', updatedAt: '' },
  ]);
  mockedBoardsApi.list.mockResolvedValue([
    { id: 'b1', title: 'Project Alpha', workspaceId: 'w1', description: null, visibility: 'private', position: 0, createdById: 'u1', archivedAt: null, createdAt: '', updatedAt: '' },
    { id: 'b2', title: 'Beta Release', workspaceId: 'w1', description: null, visibility: 'private', position: 1, createdById: 'u1', archivedAt: null, createdAt: '', updatedAt: '' },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchView', () => {
  it('should render search input with search hint', async () => {
    renderWithProviders(<SearchView />);

    const input = screen.getByPlaceholderText('sidebar.searchPlaceholder');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('sidebar.searchHint')).toBeInTheDocument();
  });

  it('should filter boards after debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchView />);

    const input = screen.getByPlaceholderText('sidebar.searchPlaceholder');
    await user.type(input, 'Alpha');

    // Before debounce — still shows hint
    expect(screen.getByText('sidebar.searchHint')).toBeInTheDocument();

    // Advance past 300ms debounce
    vi.advanceTimersByTime(350);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    // Beta should not appear
    expect(screen.queryByText('Beta Release')).not.toBeInTheDocument();
  });

  it('should show empty state when no results match', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchView />);

    const input = screen.getByPlaceholderText('sidebar.searchPlaceholder');
    await user.type(input, 'zzz-nonexistent');

    vi.advanceTimersByTime(350);

    await waitFor(() => {
      expect(screen.getByText('sidebar.searchEmpty')).toBeInTheDocument();
    });
  });

  it('should clear search on X button click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchView />);

    const input = screen.getByPlaceholderText('sidebar.searchPlaceholder') as HTMLInputElement;
    await user.type(input, 'test');

    // X button should appear after typing
    const clearButton = screen.getByRole('button');
    await user.click(clearButton);

    expect(input.value).toBe('');
  });

  it('should navigate on board click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderWithProviders(<SearchView />);

    const input = screen.getByPlaceholderText('sidebar.searchPlaceholder');
    await user.type(input, 'Alpha');
    vi.advanceTimersByTime(350);

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Project Alpha'));

    expect(mockSetNavView).toHaveBeenCalledWith('home');
    expect(mockNavigate).toHaveBeenCalledWith('/boards/b1');
  });
});
