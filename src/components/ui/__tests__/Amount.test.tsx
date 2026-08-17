import { render, screen } from '@testing-library/react-native';
import { Amount } from '../Amount';
import { mono } from '../../../theme/type';
import { lightColors } from '../../../theme/colors';

describe('Amount', () => {
  it('sets small amounts in mono regular', () => {
    render(<Amount size="sm">€9,60</Amount>);
    expect(screen.getByText('€9,60')).toHaveStyle({ fontFamily: mono.regular });
  });

  it('defaults to the standard reading colour', () => {
    render(<Amount size="sm">€9,60</Amount>);
    expect(screen.getByText('€9,60')).toHaveStyle({ color: lightColors.text });
  });

  it('uses the action colour when tone="action", even with a conflicting className', () => {
    render(
      <Amount size="sm" tone="action" className="text-text dark:text-text-dark">
        -€2,00
      </Amount>
    );
    expect(screen.getByText('-€2,00')).toHaveStyle({ color: lightColors.action });
  });

  it('sets the hero total in mono semibold', () => {
    render(<Amount size="hero">€312,47</Amount>);
    expect(screen.getByText('€312,47')).toHaveStyle({ fontFamily: mono.semibold });
  });

  it('lets a caller override the weight the size would pick', () => {
    render(
      <Amount size="sm" weight="semibold">
        €1.234,56
      </Amount>
    );
    expect(screen.getByText('€1.234,56')).toHaveStyle({ fontFamily: mono.semibold });
  });
});
