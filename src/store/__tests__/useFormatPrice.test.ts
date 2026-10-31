import { act, renderHook } from '@testing-library/react-native';
import { useFormatPrice, usePreferencesStore } from '../preferences';

test('amounts follow a language switch', () => {
  act(() => usePreferencesStore.getState().setLanguage('es'));
  const { result } = renderHook(() => useFormatPrice());
  const before = result.current.formatPrice;
  expect(before(12.34, 'EUR')).toBe('12,34 €');

  act(() => usePreferencesStore.getState().setLanguage('en'));

  expect(result.current.formatPrice).not.toBe(before);
  expect(result.current.formatPrice(12.34, 'EUR')).toBe('€12.34');
});
