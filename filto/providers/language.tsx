import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
  } from 'react';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { ja } from '@/locales/ja';
  import { en } from '@/locales/en';
  import type { Translation } from '@/locales/ja';
  
  type Language = 'ja' | 'en';
  
  const LANGUAGE_STORAGE_KEY = '@filto/display_behavior/language';
  
  interface LanguageContextValue {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: Translation;
  }
  
  const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
  
  const translations: Record<Language, Translation> = {
    ja,
    en,
  };
  
  export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>('ja');
  
    // 起動時に保存済み言語を読み込む
    useEffect(() => {
      let isMounted = true;
  
      const load = async () => {
        try {
          const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
          if (!isMounted) return;
  
          if (saved === 'ja' || saved === 'en') {
            setLanguageState(saved);
          }
        } catch {
          // 失敗時は何もしない（ja のまま）
        }
      };
  
      load();
  
      return () => {
        isMounted = false;
      };
    }, []);
  
    // 言語を永続化
    useEffect(() => {
      const save = async () => {
        try {
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch {
          // 失敗しても致命的ではないので握りつぶす
        }
      };
  
      save();
    }, [language]);
  
    const handleSetLanguage = useCallback((lang: Language) => {
      setLanguageState(lang);
    }, []);
  
    const value = useMemo(
      () => ({
        language,
        setLanguage: handleSetLanguage,
        t: translations[language],
      }),
      [language, handleSetLanguage],
    );
  
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
  };
  
  export function useLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
      throw new Error('useLanguage must be used within LanguageProvider');
    }
    return ctx;
  }