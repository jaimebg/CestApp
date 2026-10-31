import { fireEvent, render, screen } from '@testing-library/react-native';
import { ScanItemRow } from '../ScanItemRow';
import { lightColors } from '@/src/theme/colors';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const props = {
  index: 0,
  name: 'LECHE ENTERA 1L',
  quantity: 6,
  unit: null,
  unitPriceLabel: '0,98 €',
  totalPriceLabel: '5,88 €',
  categoryName: 'Lácteos',
  colors: lightColors,
  onEdit: jest.fn(),
  onRemove: jest.fn(),
};

describe('ScanItemRow', () => {
  it('reads as a ticket line that opens the item editor', () => {
    const onEdit = jest.fn();
    render(<ScanItemRow {...props} onEdit={onEdit} />);
    expect(screen.getByTestId('ticket-leader')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'LECHE ENTERA 1L, 5,88 €' }));
    expect(onEdit).toHaveBeenCalledWith(0);
  });

  it('keeps the category as quiet meta, not action ink', () => {
    render(<ScanItemRow {...props} />);
    expect(screen.getByText('6x @ 0,98 € · Lácteos')).toHaveStyle({
      color: lightColors.textSecondary,
    });
  });

  it('offers a quiet delete that removes the row', () => {
    const onRemove = jest.fn();
    render(<ScanItemRow {...props} onRemove={onRemove} />);
    const remove = screen.getByRole('button', { name: /^[^,]+: LECHE ENTERA 1L$/ });
    fireEvent.press(remove);
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
