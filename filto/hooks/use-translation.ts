import { useLanguage } from '@/providers/language';

export function useTranslation() {
  const { t } = useLanguage();
  return t;
}