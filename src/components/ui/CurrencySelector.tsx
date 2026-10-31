import { SegmentedControl } from './SegmentedControl';

/**
 * A choice of currencies, drawn by the shared segmented control so it reads
 * like every other exclusive choice in the app.
 */

interface CurrencySelectorProps {
  currencies: string[];
  selected: string;
  onSelect: (code: string) => void;
  accessibilityLabel: string;
}

export function CurrencySelector({
  currencies,
  selected,
  onSelect,
  accessibilityLabel,
}: CurrencySelectorProps) {
  return (
    <SegmentedControl
      options={currencies.map((code) => ({ value: code, label: code }))}
      value={selected}
      onChange={onSelect}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
