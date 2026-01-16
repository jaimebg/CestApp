/**
 * User Preferences Store
 * Manages all user preferences including locale, currency, and onboarding state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import {
  Currency,
  getCurrency,
  getDefaultCurrencyFromLocale,
  formatPrice as formatPriceUtil,
} from '../config/currency';
import { changeLanguage as i18nChangeLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n';

export type DateFormat = 'DMY' | 'MDY' | 'YMD';
export type DecimalSeparator = '.' | ',';

interface PreferencesState {
  // Locale preferences
  language: SupportedLanguage;
  currencyCode: string;
  currency: Currency;
  dateFormat: DateFormat;
  decimalSeparator: DecimalSeparator;

  // Onboarding state
  hasCompletedOnboarding: boolean;

  // Actions
  setLanguage: (lang: SupportedLanguage) => void;
  setCurrency: (code: string) => void;
  setDateFormat: (format: DateFormat) => void;
  setDecimalSeparator: (sep: DecimalSeparator) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // For testing

  // Currency helpers
  formatPrice: (amount: number | null, options?: { showCode?: boolean }) => string;
}

// Regions that use MDY date format
const MDY_REGIONS = ['US', 'FM', 'PW', 'PH', 'MH'];

// Regions that use YMD date format
const YMD_REGIONS = ['CN', 'JP', 'KR', 'TW', 'HU', 'LT', 'CA'];

// Regions that use comma as decimal separator
const COMMA_DECIMAL_REGIONS = [
  'DE', 'FR', 'ES', 'IT', 'PT', 'NL', 'BE', 'AT', 'CH', // Europe
  'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'UY', 'PY', // South America
  'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'HR', 'SI', 'RS', // Eastern Europe
  'GR', 'TR', 'RU', 'UA', // Others
];

/**
 * Detect initial preferences from device locale
 */
function getInitialPreferences(): {
  language: SupportedLanguage;
  currencyCode: string;
  dateFormat: DateFormat;
  decimalSeparator: DecimalSeparator;
} {
  const locale = Localization.getLocales()[0];
  const regionCode = locale?.regionCode?.toUpperCase() || '';
  const languageCode = locale?.languageCode?.toLowerCase() || 'en';

  // Language: Use device language if supported, otherwise English
  const supportedLangs = SUPPORTED_LANGUAGES.map(l => l.code);
  const language: SupportedLanguage = supportedLangs.includes(languageCode as SupportedLanguage)
    ? (languageCode as SupportedLanguage)
    : 'en';

  // Currency: Use existing logic
  const currencyCode = getDefaultCurrencyFromLocale(regionCode, languageCode);

  // Date format: MDY for US-like regions, YMD for Asian regions, DMY for rest
  let dateFormat: DateFormat = 'DMY';
  if (MDY_REGIONS.includes(regionCode)) {
    dateFormat = 'MDY';
  } else if (YMD_REGIONS.includes(regionCode)) {
    dateFormat = 'YMD';
  }

  // Decimal separator: Comma for European/South American regions, dot for rest
  const decimalSeparator: DecimalSeparator = COMMA_DECIMAL_REGIONS.includes(regionCode) ? ',' : '.';

  return { language, currencyCode, dateFormat, decimalSeparator };
}

const initialPrefs = getInitialPreferences();

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      // Initial values from device locale
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
          // Reconstruct derived currency object
          state.currency = getCurrency(state.currencyCode);
          // Sync i18n with persisted language
          i18nChangeLanguage(state.language);
        }
      },
    }
  )
);

// Backward compatibility: Export hook for price formatting (same as old currency store)
export function useFormatPrice() {
  const formatPrice = usePreferencesStore((state) => state.formatPrice);
  const currency = usePreferencesStore((state) => state.currency);
  return { formatPrice, currency };
}

// Backward compatibility: Export useCurrencyStore pointing to preferences store
export const useCurrencyStore = usePreferencesStore;

// Export the initial preferences detection for use in onboarding
export { getInitialPreferences };
