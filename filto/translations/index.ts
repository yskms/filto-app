import { ja } from './ja';
import { en } from './en';

export const translations = {
  ja,
  en,
} as const;

export type SupportedLanguage = keyof typeof translations;
export type { TranslationKeys } from './ja';