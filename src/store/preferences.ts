/**
 * User Preferences Store
 * Language, appearance and the home currency the dashboard leads with.
 * The parser hints (DMY dates, decimal comma) keep their Spanish defaults.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import * as Localization from 'expo-localization';
import {
  type Currency,
  getCurrency,
  getNumberLocale,
  formatPrice as formatPriceUtil,
  formatAmountInput as formatAmountInputUtil,
} from '../config/currency';
import {
  changeLanguage as i18nChangeLanguage,
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from '../i18n';

export type ColorScheme = 'light' | 'dark';
export type DateFormat = 'DMY' | 'MDY' | 'YMD';
export type DecimalSeparator = '.' | ',';

interface PreferencesState {
  language: SupportedLanguage;
  colorScheme: ColorScheme;
  /** The device region's currency, or EUR; never persisted, so it follows the device. */
  homeCurrency: Currency;
  dateFormat: DateFormat;
  decimalSeparator: DecimalSeparator;

  hasCompletedOnboarding: boolean;
  llmRefinementEnabled: boolean;

  setLanguage: (lang: SupportedLanguage) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setLlmRefinementEnabled: (enabled: boolean) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;

  /** Formats in `currencyCode`, or the home currency when omitted. */
  formatPrice: (amount: number | null, currencyCode?: string | null) => string;
  formatAmountInput: (amount: number | null | undefined, decimals?: number) => string;
}

/**
 * Spanish defaults
 */
const SPAIN_DEFAULTS = {
  dateFormat: 'DMY' as DateFormat,
  decimalSeparator: ',' as DecimalSeparator,
};

function deviceHomeCurrency(): Currency {
  return getCurrency(Localization.getLocales()[0]?.currencyCode);
}

/**
 * Detect initial preferences from device locale
 * Simplified: Uses Spanish defaults with language detection
 */
function getInitialPreferences(): {
  language: SupportedLanguage;
  colorScheme: ColorScheme;
  dateFormat: DateFormat;
  decimalSeparator: DecimalSeparator;
} {
  const locale = Localization.getLocales()[0];
  const languageCode = locale?.languageCode?.toLowerCase() || 'es';

  const supportedLangs = SUPPORTED_LANGUAGES.map((l) => l.code);
  const language: SupportedLanguage = supportedLangs.includes(languageCode as SupportedLanguage)
    ? (languageCode as SupportedLanguage)
    : 'es';

  const raw = Appearance.getColorScheme();
  const colorScheme: ColorScheme = raw === 'dark' ? 'dark' : 'light';

  return {
    language,
    colorScheme,
    dateFormat: SPAIN_DEFAULTS.dateFormat,
    decimalSeparator: SPAIN_DEFAULTS.decimalSeparator,
  };
}

const initialPrefs = getInitialPreferences();

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      language: initialPrefs.language,
      colorScheme: initialPrefs.colorScheme,
      homeCurrency: deviceHomeCurrency(),
      dateFormat: initialPrefs.dateFormat,
      decimalSeparator: initialPrefs.decimalSeparator,
      hasCompletedOnboarding: false,
      llmRefinementEnabled: true,

      setLanguage: (lang: SupportedLanguage) => {
        i18nChangeLanguage(lang);
        set({ language: lang });
      },

      setColorScheme: (scheme: ColorScheme) => {
        set({ colorScheme: scheme });
      },

      setLlmRefinementEnabled: (enabled: boolean) => set({ llmRefinementEnabled: enabled }),

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false });
      },

      formatPrice: (amount: number | null, currencyCode?: string | null) => {
        const { homeCurrency, language } = get();
        return formatPriceUtil(
          amount,
          getCurrency(currencyCode ?? homeCurrency.code),
          getNumberLocale(language)
        );
      },

      formatAmountInput: (amount: number | null | undefined, decimals?: number) =>
        formatAmountInputUtil(amount, getNumberLocale(get().language), decimals),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        colorScheme: state.colorScheme,
        dateFormat: state.dateFormat,
        decimalSeparator: state.decimalSeparator,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        llmRefinementEnabled: state.llmRefinementEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.homeCurrency = deviceHomeCurrency();
          i18nChangeLanguage(state.language);
        }
      },
    }
  )
);

export function useFormatPrice() {
  const formatPrice = usePreferencesStore((state) => state.formatPrice);
  const formatAmountInput = usePreferencesStore((state) => state.formatAmountInput);
  const homeCurrency = usePreferencesStore((state) => state.homeCurrency);
  return { formatPrice, formatAmountInput, homeCurrency };
}
