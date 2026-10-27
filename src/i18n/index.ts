import { en } from './locales/en';
import { ta } from './locales/ta';

export type Language = 'en' | 'ta';
export const dictionaries = { en, ta } as const;
export function text(language: Language) {
  return dictionaries[language];
}
