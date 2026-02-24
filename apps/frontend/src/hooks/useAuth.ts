import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi, type LoginRequest, type RegisterRequest } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

export function useLogin() {
  const { setUser, setTokens } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      navigate('/');
    },
  });
}

export function useRegister() {
  const { setUser, setTokens } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (data) => {
      setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      setUser(data.user);
      navigate('/');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
    },
  });
}

export function useProfile() {
  const { setUser, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const data = await authApi.getProfile();
      setUser(data);
      return data;
    },
    enabled: isAuthenticated,
    retry: false,
  });
}
