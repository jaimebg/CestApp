import { render, screen } from '@testing-library/react-native';
import { ListGroup, ListRow } from '../ListGroup';
import { lightColors } from '@/src/theme/colors';

describe('ListRow', () => {
  it('sets a destructive row in error ink without a red fill', () => {
    render(
      <ListGroup>
        <ListRow title="Borrar todos los datos" destructive onPress={jest.fn()} />
      </ListGroup>
    );
    expect(screen.getByText('Borrar todos los datos')).toHaveStyle({ color: lightColors.error });
    const row = screen.getByRole('button', { name: 'Borrar todos los datos' });
    expect(row).not.toHaveStyle({ backgroundColor: lightColors.error });
  });

  it('is a button only when it can be pressed', () => {
    render(
      <ListGroup>
        <ListRow title="Versión" value="1.0.0" />
      </ListGroup>
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('1.0.0')).toBeTruthy();
  });

  it('cannot be pressed while disabled', () => {
    const onPress = jest.fn();
    render(
      <ListGroup>
        <ListRow title="Desde la galería" disabled onPress={onPress} />
      </ListGroup>
    );
    const row = screen.getByRole('button', { name: 'Desde la galería' });
    expect(row).toBeDisabled();
  });

  it('shows the group footer under its rows', () => {
    render(
      <ListGroup footer="Formato de fecha DD/MM/AAAA">
        <ListRow title="Idioma" />
      </ListGroup>
    );
    expect(screen.getByText('Formato de fecha DD/MM/AAAA')).toHaveStyle({
      color: lightColors.textTertiary,
    });
  });

  it('draws nothing when every row is conditional and none applies', () => {
    const { toJSON } = render(
      <ListGroup>
        {false}
        {null}
      </ListGroup>
    );
    expect(toJSON()).toBeNull();
  });

  it('announces busy and expanded states and accepts its own label and hint', () => {
    render(
      <ListGroup>
        <ListRow
          title="Versión"
          value="1.0.0"
          accessibilityLabel="Versión 1.0.0"
          accessibilityHint="Pulsa cinco veces"
          busy
          expanded
          onPress={jest.fn()}
        />
      </ListGroup>
    );
    const row = screen.getByRole('button', { name: 'Versión 1.0.0' });
    expect(row).toHaveProp('accessibilityHint', 'Pulsa cinco veces');
    expect(row).toBeBusy();
    expect(row).toBeExpanded();
  });

  it('keeps the busy row at full strength while it blocks the others', () => {
    render(
      <ListGroup>
        <ListRow title="Desde la galería" disabled busy onPress={jest.fn()} />
      </ListGroup>
    );
    expect(screen.getByRole('button', { name: 'Desde la galería' })).not.toHaveStyle({
      opacity: 0.5,
    });
  });
});
