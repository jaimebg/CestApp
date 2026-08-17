import { fireEvent, render, screen } from '@testing-library/react-native';
import { CollapsibleItemList, COLLAPSE_THRESHOLD } from '../CollapsibleItemList';
import type { Item } from '../../../db/schema/items';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

function makeItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    item: {
      id: i + 1,
      receiptId: 1,
      name: `Artículo ${i + 1}`,
      price: 100 * (i + 1),
      quantity: 1,
      unitPrice: null,
      unit: null,
    } as unknown as Item,
    category: null,
  }));
}

describe('CollapsibleItemList', () => {
  it('renders every row when the receipt is short', () => {
    render(<CollapsibleItemList items={makeItems(20)} />);

    expect(screen.getByText('Artículo 20')).toBeTruthy();
    expect(screen.queryByText(/Show .* more/)).toBeNull();
  });

  // The fixture tracks COLLAPSE_THRESHOLD rather than a literal count so this
  // test keeps probing the true edge if the threshold ever changes.
  it('shows every row and no control at exactly the threshold', () => {
    render(<CollapsibleItemList items={makeItems(COLLAPSE_THRESHOLD)} />);

    expect(screen.getByText(`Artículo ${COLLAPSE_THRESHOLD}`)).toBeTruthy();
    expect(screen.queryByText(/Show .* more/)).toBeNull();
  });

  it('renders the first 25 rows and offers the rest when the receipt is long', () => {
    render(<CollapsibleItemList items={makeItems(30)} />);

    expect(screen.getByText('Artículo 25')).toBeTruthy();
    expect(screen.queryByText('Artículo 26')).toBeNull();
    expect(screen.getByText('Show 5 more items')).toBeTruthy();
  });

  it('reveals the remaining rows when the control is pressed', () => {
    render(<CollapsibleItemList items={makeItems(30)} />);

    fireEvent.press(screen.getByText('Show 5 more items'));

    expect(screen.getByText('Artículo 30')).toBeTruthy();
    expect(screen.queryByText(/Show .* more/)).toBeNull();
  });

  it('uses the singular label when exactly one row is hidden', () => {
    render(<CollapsibleItemList items={makeItems(26)} />);

    expect(screen.getByText('Show 1 more item')).toBeTruthy();
  });
});
