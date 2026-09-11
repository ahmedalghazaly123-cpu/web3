import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { languages, getDirection } from '../../../i18n';
import { Globe } from 'lucide-react';
import { Dropdown } from './Dropdown';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    setCurrentLang(i18n.language);
  }, [i18n.language]);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    const dir = getDirection(lang);
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle('arabic', dir === 'rtl');
  };

  const currentLangObj = languages.find((l) => l.code === currentLang) ?? languages[0];

  return (
    <Dropdown
      align="end"
      width="w-44"
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
          aria-label={t('language')}
        >
          <Globe className="w-5 h-5" />
          <span className="text-sm font-medium">{currentLangObj.label}</span>
        </button>
      }
      items={languages.map((lang) => ({
        id: lang.code,
        label: lang.label,
        onClick: () => handleLanguageChange(lang.code),
      }))}
    />
  );
}
