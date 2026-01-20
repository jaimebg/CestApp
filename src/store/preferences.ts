/**
 * User Preferences Store
 * Manages user preferences, simplified for Spanish-focused app
 * Defaults: DMY date format, comma decimal separator, EUR currency
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import {
  Currency,
  getCurrency,
  formatPrice as formatPriceUtil,
  DEFAULT_CURRENCY,
} from '../config/currency';
import {
  changeLanguage as i18nChangeLanguage,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '../i18n';

export type DateFormat = 'DMY' | 'MDY' | 'YMD';
export type DecimalSeparator = '.' | ',';

interface PreferencesState {
  language: SupportedLanguage;
  currencyCode: string;
  currency: Currency;
  dateFormat: DateFormat;
  decimalSeparator: DecimalSeparator;

  hasCompletedOnboarding: boolean;

  setLanguage: (lang: SupportedLanguage) => void;
  setCurrency: (code: string) => void;
  setDateFormat: (format: DateFormat) => void;
  setDecimalSeparator: (sep: DecimalSeparator) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  formatPrice: (amount: number | null, options?: { showCode?: boolean }) => string;
}

/**
 * Spanish defaults
 */
const SPAIN_DEFAULTS = {
  dateFormat: 'DMY' as DateFormat,
  decimalSeparator: ',' as DecimalSeparator,
  currencyCode: DEFAULT_CURRENCY,
};

/**
 * Detect initial preferences from device locale
 * Simplified: Uses Spanish defaults with language detection
 */
function getInitialPreferences(): {
  language: SupportedLanguage;
  currencyCode: string;
  dateFormat: DateFormat;
  decimalSeparator: DecimalSeparator;
} {
  const locale = Localization.getLocales()[0];
  const languageCode = locale?.languageCode?.toLowerCase() || 'es';

  // Detect language, default to Spanish
  const supportedLangs = SUPPORTED_LANGUAGES.map((l) => l.code);
  const language: SupportedLanguage = supportedLangs.includes(languageCode as SupportedLanguage)
    ? (languageCode as SupportedLanguage)
    : 'es';

  // Always use Spanish defaults for number/date formatting
  return {
    language,
    currencyCode: SPAIN_DEFAULTS.currencyCode,
    dateFormat: SPAIN_DEFAULTS.dateFormat,
    decimalSeparator: SPAIN_DEFAULTS.decimalSeparator,
  };
}

const initialPrefs = getInitialPreferences();

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      language: initialPrefs.language,
      currencyCode: initialPrefs.currencyCode,
      currency: getCurrency(initialPrefs.currencyCode),
      dateFormat: initialPrefs.dateFormat,
      decimalSeparator: initialPrefs.decimalSeparator,
      hasCompletedOnboarding: false,

      setLanguage: (lang: SupportedLanguage) => {
        i18nChangeLanguage(lang);
        set({ language: lang });
      },

      setCurrency: (code: string) => {
        const currency = getCurrency(code);
        set({ currencyCode: code, currency });
      },

      setDateFormat: (format: DateFormat) => {
        set({ dateFormat: format });
      },

      setDecimalSeparator: (sep: DecimalSeparator) => {
        set({ decimalSeparator: sep });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false });
      },

      formatPrice: (amount: number | null, options?: { showCode?: boolean }) => {
        const { currency } = get();
        return formatPriceUtil(amount, currency, options);
      },
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        currencyCode: state.currencyCode,
        dateFormat: state.dateFormat,
        decimalSeparator: state.decimalSeparator,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.currency = getCurrency(state.currencyCode);
          i18nChangeLanguage(state.language);
        }
      },
    }
  )
);

export function useFormatPrice() {
  const formatPrice = usePreferencesStore((state) => state.formatPrice);
  const currency = usePreferencesStore((state) => state.currency);
  return { formatPrice, currency };
}

export const useCurrencyStore = usePreferencesStore;

export { getInitialPreferences };
