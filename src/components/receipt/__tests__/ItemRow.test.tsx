import { render, screen } from '@testing-library/react-native';
import { ItemRow } from '../ItemRow';
import type { Item } from '@/src/db/schema/items';
import type { Category } from '@/src/db/schema/categories';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const item = {
  id: 1,
  receiptId: 1,
  name: 'HUEVOS CAMPEROS',
  price: 289,
  quantity: 12,
  unitPrice: null,
  unit: null,
} as unknown as Item;

const dairy = { id: 2, name: 'Dairy', icon: '🥛', color: '#5BA4D9' } as unknown as Category;

describe('ItemRow', () => {
  it('prints the item as a ticket line with its amount', () => {
    render(<ItemRow item={item} currency="EUR" category={dairy} />);
    expect(screen.getByLabelText(/^HUEVOS CAMPEROS, 12x · .+, .*2[.,]89/)).toBeTruthy();
    expect(screen.getByTestId('ticket-leader')).toBeTruthy();
  });

  it('shows quantity and category as plain text, without the category emoji', () => {
    render(<ItemRow item={item} currency="EUR" category={dairy} />);
    expect(screen.getByText(/^12x · /)).toBeTruthy();
    expect(screen.queryByText('🥛')).toBeNull();
  });
});
