import { render, screen } from '@testing-library/react-native';
import { Amount } from '../Amount';
import { mono } from '../../../theme/type';

describe('Amount', () => {
  it('sets small amounts in mono regular', () => {
    render(<Amount size="sm">€9,60</Amount>);
    expect(screen.getByText('€9,60')).toHaveStyle({ fontFamily: mono.regular });
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
