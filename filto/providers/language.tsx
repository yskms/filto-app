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
  import * as Localization from 'expo-localization';
  import { translations, type SupportedLanguage } from '@/translations';

  const LANGUAGE_STORAGE_KEY = '@filto/display_behavior/language';

  function detectSystemLanguage(): SupportedLanguage {
    const locales = Localization.getLocales();
    for (const locale of locales) {
      const lang = locale.languageCode;
      if (lang && lang in translations) {
        return lang as SupportedLanguage;
      }
    }
    return 'en';
  }
  
  interface LanguageContextValue {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => Promise<void>;
    t: TranslateFunction;
  }
  
  type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;
  
  const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
  
  /**
   * LanguageProvider
   * アプリ全体の言語設定を管理
   */
  export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<SupportedLanguage>(() => detectSystemLanguage());
  
    // 起動時に保存済み言語を読み込む
    useEffect(() => {
      let isMounted = true;
  
      const load = async () => {
        try {
          const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
          if (!isMounted) return;
  
          if (saved && saved in translations) {
            setLanguageState(saved as SupportedLanguage);
          } else {
            setLanguageState(detectSystemLanguage());
          }
        } catch (_) {
          // 読み込み失敗時はデフォルト言語（ja）のまま継続
        }
      };
  
      load();
  
      return () => {
        isMounted = false;
      };
    }, []);
  
    // 言語を設定して永続化
    const setLanguage = useCallback(async (lang: SupportedLanguage) => {
      try {
        setLanguageState(lang);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      } catch (error) {
        throw error;
      }
    }, []);
  
    // 翻訳関数
    const t = useCallback<TranslateFunction>(
      (key: string, params?: Record<string, string | number>) => {
        const keys = key.split('.');
        let value: any = translations[language];
  
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            // キーが見つからない場合はキー自体を返す
            return key;
          }
        }
  
        if (typeof value !== 'string') {
          return key;
        }
  
        // パラメータ置換 {{key}} -> value
        if (params) {
          return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
            const replacement = params[paramKey];
            return replacement !== undefined ? String(replacement) : match;
          });
        }
  
        return value;
      },
      [language]
    );
  
    const value = useMemo(
      () => ({
        language,
        setLanguage,
        t,
      }),
      [language, setLanguage, t]
    );
  
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
  };
  
  /**
   * useLanguage
   * 言語コンテキストを取得するフック
   */
  export function useLanguage(): LanguageContextValue {
    const ctx = useContext(LanguageContext);
    if (!ctx) {
      throw new Error('useLanguage must be used within LanguageProvider');
    }
    return ctx;
  }
  
  /**
   * useTranslation
   * 翻訳関数を取得するフック (エイリアス)
   */
  export function useTranslation() {
    const { t } = useLanguage();
    return { t };
  }