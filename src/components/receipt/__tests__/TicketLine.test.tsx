import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import * as RN from 'react-native';
import { TicketLine } from '../TicketLine';
import { lightColors } from '@/src/theme/colors';

const LONG_NAME = 'ACEITE OLIVA VIRGEN EXTRA BOTELLA 1L PACK AHORRO FAMILIAR 3X';

describe('TicketLine', () => {
  it('keeps the whole amount when the concept is long', () => {
    render(<TicketLine label={LONG_NAME} amount="8,99 €" />);
    expect(screen.getByText('8,99 €')).toBeTruthy();
    expect(screen.getByTestId('ticket-amount')).toHaveStyle({ flexShrink: 0 });
  });

  it('joins concept and amount with a dotted leader', () => {
    render(<TicketLine label="PAN BARRA" amount="0,65 €" />);
    expect(screen.getByTestId('ticket-leader')).toBeTruthy();
  });

  it('sets the total without a leader', () => {
    render(<TicketLine label="Total" amount="29,55 €" variant="total" />);
    expect(screen.queryByTestId('ticket-leader')).toBeNull();
  });

  it('reads concept and amount together to a screen reader', () => {
    render(<TicketLine label="PAN BARRA" amount="0,65 €" meta="Panadería" />);
    expect(screen.getByLabelText('PAN BARRA, Panadería, 0,65 €')).toBeTruthy();
  });

  it('sets an amount that does not add up in error ink', () => {
    render(<TicketLine label="Total" amount="31,00 €" variant="total" danger />);
    expect(screen.getByText('31,00 €')).toHaveStyle({ color: lightColors.error });
  });

  it('reads quantity and category to a screen reader, not only concept and amount', () => {
    render(<TicketLine label="PLATANO" amount="2,40 €" meta="2x @ 1,20 € / kg · Fruta" />);
    expect(screen.getByLabelText('PLATANO, 2x @ 1,20 € / kg · Fruta, 2,40 €')).toBeTruthy();
  });

  it('passes a hint to the pressable row', () => {
    render(
      <TicketLine label="PAN" amount="0,65 €" onPress={jest.fn()} accessibilityHint="Edit item" />
    );
    expect(screen.getByRole('button', { name: 'PAN, 0,65 €' })).toHaveProp(
      'accessibilityHint',
      'Edit item'
    );
  });

  it('lets an adornment after the amount open the row', () => {
    const onPress = jest.fn();
    render(
      <TicketLine
        label="Total"
        amount="31,00 €"
        variant="total"
        onPress={onPress}
        adornment={<View testID="pencil" />}
      />
    );
    fireEvent.press(screen.getByTestId('pencil'));
    expect(onPress).toHaveBeenCalled();
  });

  it('stacks the amount under the concept at large text sizes', () => {
    const spy = jest
      .spyOn(RN, 'useWindowDimensions')
      .mockReturnValue({ width: 375, height: 812, scale: 3, fontScale: 2 });
    render(<TicketLine label="ACEITE OLIVA VIRGEN EXTRA" amount="8,99 €" />);
    expect(screen.getByTestId('ticket-line-stacked')).toBeTruthy();
    spy.mockRestore();
  });
});
