import { useOutletContext } from 'react-router-dom';
import type { Language } from './index';

export function useAppLanguage() {
  const context = useOutletContext<{ language: Language } | undefined>();
  return context?.language ?? (localStorage.getItem('karyapulse.language.v1') === 'ta' ? 'ta' : 'en');
}
