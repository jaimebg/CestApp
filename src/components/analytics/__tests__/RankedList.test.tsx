import { render, screen } from '@testing-library/react-native';
import { RankedList } from '../RankedList';
import { lightColors } from '@/src/theme/colors';

const rows = [
  { key: 'meat', label: 'Carnes', amount: '37,06 €', share: 30 },
  { key: 'pantry', label: 'Despensa', amount: '18,53 €', share: 15 },
];

describe('RankedList', () => {
  it('accents only the leading bar', () => {
    render(<RankedList rows={rows} />);
    expect(screen.getByTestId('ranked-bar-meat')).toHaveStyle({
      backgroundColor: lightColors.action,
    });
    expect(screen.getByTestId('ranked-bar-pantry')).toHaveStyle({
      backgroundColor: lightColors.border,
    });
  });

  it('sizes each bar against the leader', () => {
    render(<RankedList rows={rows} />);
    expect(screen.getByTestId('ranked-bar-meat')).toHaveStyle({ width: '100%' });
    expect(screen.getByTestId('ranked-bar-pantry')).toHaveStyle({ width: '50%' });
  });

  it('shows the amount and the share of each row', () => {
    render(<RankedList rows={rows} />);
    expect(screen.getByText('37,06 €')).toBeTruthy();
    expect(screen.getByText('30 %')).toBeTruthy();
  });
});
