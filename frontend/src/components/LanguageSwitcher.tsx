import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface LanguageSwitcherProps {
  collapsed?: boolean;
}

export default function LanguageSwitcher({ collapsed = false }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
  ];

  const currentLang = languages.find(l => l.code === language);

  const handleLanguageChange = () => {
    // Toggle between languages
    const nextLang = language === 'en' ? 'zh' : 'en';
    setLanguage(nextLang);
  };

  return (
    <button
      onClick={handleLanguageChange}
      className="flex items-center gap-2 px-3 py-2 w-full text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted rounded-lg transition-all duration-200"
      title={collapsed ? `${currentLang?.flag} ${currentLang?.label}` : undefined}
    >
      <Globe size={18} />
      {!collapsed && (
        <span className="text-sm font-medium flex items-center gap-2">
          {currentLang?.flag} {currentLang?.label}
        </span>
      )}
    </button>
  );
}
