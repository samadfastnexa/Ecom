import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';

type Language = 'en' | 'ur';

interface Translation {
  slug: string;
  text_en: string;
  text_ur: string;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (slug: string, fallback?: string, params?: Record<string, string>) => string;
  isLoading: boolean;
  /** User types allowed to switch language (from admin settings). Empty = no one. */
  allowedUserTypes: string[];
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: () => '',
  isLoading: true,
  allowedUserTypes: [],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Record<string, Translation>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [allowedUserTypes, setAllowedUserTypes] = useState<string[]>([]);

  useEffect(() => {
    loadLanguageAndTranslations();
  }, []);

  const loadLanguageAndTranslations = async () => {
    try {
      // Load saved language preference
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang === 'en' || savedLang === 'ur') {
        setLanguageState(savedLang);
      }

      // Fetch translations and language access settings in parallel
      const [transRes, accessRes] = await Promise.allSettled([
        fetch(`${API_URL}/localization/translations/`),
        fetch(`${API_URL}/localization/language-access/`),
      ]);

      if (transRes.status === 'fulfilled' && transRes.value.ok) {
        const data: Translation[] = await transRes.value.json();
        const translationMap: Record<string, Translation> = {};
        data.forEach(item => { translationMap[item.slug] = item; });
        setTranslations(translationMap);
        await AsyncStorage.setItem('app_translations', JSON.stringify(translationMap));
      } else {
        const cached = await AsyncStorage.getItem('app_translations');
        if (cached) setTranslations(JSON.parse(cached));
      }

      if (accessRes.status === 'fulfilled' && accessRes.value.ok) {
        const accessData = await accessRes.value.json();
        setAllowedUserTypes(accessData.allowed_user_types ?? []);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
      const cached = await AsyncStorage.getItem('app_translations');
      if (cached) setTranslations(JSON.parse(cached));
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  const t = (slug: string, fallback?: string, params?: Record<string, string>): string => {
    const translation = translations[slug];
    let text = translation ? (language === 'ur' ? (translation.text_ur || translation.text_en) : translation.text_en) : (fallback || slug);
    
    if (params) {
      Object.keys(params).forEach(key => {
        text = text.replace(new RegExp(`{${key}}`, 'g'), params[key]);
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLoading, allowedUserTypes }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
