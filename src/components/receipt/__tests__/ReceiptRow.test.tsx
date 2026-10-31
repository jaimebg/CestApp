import { fireEvent, render, screen } from '@testing-library/react-native';
import { ReceiptRow } from '../ReceiptRow';

const LONG_STORE = 'Supermercados Hipercor Centro Comercial Castellana';

describe('ReceiptRow', () => {
  it('keeps a long store name to one line and the amount whole', () => {
    render(
      <ReceiptRow
        storeName={LONG_STORE}
        meta="vie 30 oct · 10 artículos"
        amount="129,55 €"
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText(LONG_STORE)).toHaveProp('numberOfLines', 1);
    expect(screen.getByText('129,55 €')).toBeTruthy();
    expect(screen.getByTestId('receipt-row-amount')).toHaveStyle({ flexShrink: 0 });
  });

  it('opens the receipt when pressed', () => {
    const onPress = jest.fn();
    render(<ReceiptRow storeName="Lidl" meta="mar 27 oct" amount="18,93 €" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
