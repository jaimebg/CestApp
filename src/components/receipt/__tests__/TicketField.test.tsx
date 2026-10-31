import { fireEvent, render, screen } from '@testing-library/react-native';
import { TicketField } from '../TicketField';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

const LONG = 'Supermercados Hipercor Centro Comercial Castellana Norte';

describe('TicketField', () => {
  it('keeps a long value on one shrinking line so the pencil stays on the paper', () => {
    render(<TicketField value={LONG} accessibilityLabel="Editar tienda" onPress={jest.fn()} />);
    const text = screen.getByText(LONG);
    expect(text).toHaveProp('numberOfLines', 1);
    expect(text).toHaveStyle({ flexShrink: 1 });
  });

  it('opens its editor when pressed', () => {
    const onPress = jest.fn();
    render(<TicketField value="Lidl" accessibilityLabel="Editar tienda" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Editar tienda' }));
    expect(onPress).toHaveBeenCalled();
  });
});
