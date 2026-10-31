import { render, screen } from '@testing-library/react-native';
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
    expect(screen.getByLabelText('PAN BARRA, 0,65 €')).toBeTruthy();
  });

  it('sets an amount that does not add up in error ink', () => {
    render(<TicketLine label="Total" amount="31,00 €" variant="total" danger />);
    expect(screen.getByText('31,00 €')).toHaveStyle({ color: lightColors.error });
  });
});
