import React from 'react';
import { useTranslation } from 'react-i18next';
import { persistLanguage } from '../../i18n';
import './LanguageSwitcher.css';

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage || i18n.language;
  const nextLanguage = language === 'he' ? 'en' : 'he';

  return (
    <button
      type="button"
      className="language-switcher"
      onClick={() => persistLanguage(nextLanguage)}
      aria-label={nextLanguage === 'he' ? t('language.switchToHebrew') : t('language.switchToEnglish')}
      title={t('language.label')}
      data-testid="language-switcher"
    >
      <span aria-hidden="true">🌐</span>
      <span>{nextLanguage === 'he' ? 'עברית' : 'EN'}</span>
    </button>
  );
};

export default LanguageSwitcher;
