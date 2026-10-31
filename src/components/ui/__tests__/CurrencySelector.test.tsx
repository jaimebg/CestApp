import { fireEvent, render, screen } from '@testing-library/react-native';
import { CurrencySelector } from '../CurrencySelector';

describe('CurrencySelector', () => {
  it('offers each currency and marks the selected one', () => {
    render(
      <CurrencySelector
        currencies={['EUR', 'GBP']}
        selected="GBP"
        onSelect={() => {}}
        accessibilityLabel="Currency"
      />
    );
    expect(screen.getByRole('button', { name: 'EUR' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
    expect(screen.getByRole('button', { name: 'GBP' }).props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('reports the currency pressed', () => {
    const onSelect = jest.fn();
    render(
      <CurrencySelector
        currencies={['EUR', 'GBP']}
        selected="EUR"
        onSelect={onSelect}
        accessibilityLabel="Currency"
      />
    );
    fireEvent.press(screen.getByRole('button', { name: 'GBP' }));
    expect(onSelect).toHaveBeenCalledWith('GBP');
  });
});
