import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLogin } from '@/hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();
  const { t } = useTranslation('auth');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg shadow-sm border border-[var(--border-secondary)] p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">{t('login')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            {t('email')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
            {t('password')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border-secondary)] rounded-md bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
            required
            minLength={8}
          />
        </div>
        {loginMutation.isError && (
          <p className="text-sm text-red-600">
            {t('invalidCredentials')}
          </p>
        )}
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full py-2 px-4 bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50 font-medium"
        >
          {loginMutation.isPending ? t('loggingIn') : t('login')}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--text-tertiary)]">
        {t('noAccount')}{' '}
        <Link to="/register" className="text-[var(--accent)] hover:underline">
          {t('register')}
        </Link>
      </p>
    </div>
  );
}
