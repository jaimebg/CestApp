import { fireEvent, render, screen } from '@testing-library/react-native';
import { Chip } from '../Chip';
import { MIN_TARGET } from '@/src/theme/a11y';

describe('Chip', () => {
  it('exposes whether it is selected', () => {
    render(<Chip label="Mercadona" selected onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Mercadona' })).toBeSelected();
  });

  it('is a full-size tap target that calls back when pressed', () => {
    const onPress = jest.fn();
    render(<Chip label="Lidl" onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Lidl' });
    expect(chip).toHaveStyle({ minHeight: MIN_TARGET });
    fireEvent.press(chip);
    expect(onPress).toHaveBeenCalled();
  });
});
