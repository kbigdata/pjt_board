import { ReactElement, ReactNode } from 'react';
import { render, renderHook, RenderOptions, RenderHookOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Minimal i18n for tests — ciMode returns keys as-is
const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: 'cimode',
  resources: {},
  interpolation: { escapeValue: false },
});

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

function createWrapper(queryClient?: QueryClient) {
  const client = queryClient ?? createTestQueryClient();
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={client}>
        <I18nextProvider i18n={testI18n}>
          <MemoryRouter>{children}</MemoryRouter>
        </I18nextProvider>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient },
) {
  const { queryClient, ...renderOptions } = options ?? {};
  return render(ui, {
    wrapper: createWrapper(queryClient),
    ...renderOptions,
  });
}

export function renderHookWithProviders<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options?: Omit<RenderHookOptions<TProps>, 'wrapper'> & { queryClient?: QueryClient },
) {
  const { queryClient, ...hookOptions } = options ?? {};
  return renderHook(hook, {
    wrapper: createWrapper(queryClient),
    ...hookOptions,
  });
}

export { screen, waitFor, within, act } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
