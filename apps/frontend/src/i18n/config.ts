import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Korean translations
import koCommon from './locales/ko/common.json';
import koNav from './locales/ko/nav.json';
import koBoard from './locales/ko/board.json';
import koCard from './locales/ko/card.json';
import koColumn from './locales/ko/column.json';
import koComment from './locales/ko/comment.json';
import koFilter from './locales/ko/filter.json';
import koSettings from './locales/ko/settings.json';
import koAuth from './locales/ko/auth.json';
import koNotification from './locales/ko/notification.json';
import koActivity from './locales/ko/activity.json';
import koAutomation from './locales/ko/automation.json';
import koDashboard from './locales/ko/dashboard.json';
import koErrors from './locales/ko/errors.json';

// English translations
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enBoard from './locales/en/board.json';
import enCard from './locales/en/card.json';
import enColumn from './locales/en/column.json';
import enComment from './locales/en/comment.json';
import enFilter from './locales/en/filter.json';
import enSettings from './locales/en/settings.json';
import enAuth from './locales/en/auth.json';
import enNotification from './locales/en/notification.json';
import enActivity from './locales/en/activity.json';
import enAutomation from './locales/en/automation.json';
import enDashboard from './locales/en/dashboard.json';
import enErrors from './locales/en/errors.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: {
        common: koCommon,
        nav: koNav,
        board: koBoard,
        card: koCard,
        column: koColumn,
        comment: koComment,
        filter: koFilter,
        settings: koSettings,
        auth: koAuth,
        notification: koNotification,
        activity: koActivity,
        automation: koAutomation,
        dashboard: koDashboard,
        errors: koErrors,
      },
      en: {
        common: enCommon,
        nav: enNav,
        board: enBoard,
        card: enCard,
        column: enColumn,
        comment: enComment,
        filter: enFilter,
        settings: enSettings,
        auth: enAuth,
        notification: enNotification,
        activity: enActivity,
        automation: enAutomation,
        dashboard: enDashboard,
        errors: enErrors,
      },
    },
    fallbackLng: 'ko',
    defaultNS: 'common',
    ns: [
      'common', 'nav', 'board', 'card', 'column', 'comment',
      'filter', 'settings', 'auth', 'notification',
      'activity', 'automation', 'dashboard', 'errors',
    ],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'kanflow-lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
