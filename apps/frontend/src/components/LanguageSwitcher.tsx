import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('nav');

  const currentLang = i18n.language?.startsWith('ko') ? 'ko' : 'en';

  return (
    <div className="flex items-center gap-1">
      {(['ko', 'en'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => i18n.changeLanguage(lang)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            currentLang === lang
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
          }`}
        >
          {lang === 'ko' ? '한국어' : 'English'}
        </button>
      ))}
    </div>
  );
}
