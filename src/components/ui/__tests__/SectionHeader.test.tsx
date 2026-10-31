import { render, screen } from '@testing-library/react-native';
import { SectionHeader } from '../SectionHeader';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('SectionHeader', () => {
  it('lets a long title shrink so the action stays on screen', () => {
    render(
      <SectionHeader title="Tickets recientes" action={{ label: 'Todo', onPress: jest.fn() }} />
    );
    expect(screen.getByRole('header')).toHaveStyle({ flexShrink: 1 });
  });
});
