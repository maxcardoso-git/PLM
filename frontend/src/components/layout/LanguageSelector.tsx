import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'en', name: 'EN', flag: 'US' },
  { code: 'pt', name: 'PT', flag: 'BR' },
  { code: 'es', name: 'ES', flag: 'ES' },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="flex items-center gap-1">
      <Globe size={14} className="text-gray-500 mr-1" />
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            i18n.language === lang.code || (i18n.language?.startsWith(lang.code))
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title={lang.name}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
}
