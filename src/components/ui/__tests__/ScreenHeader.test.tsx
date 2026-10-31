import { render, screen } from '@testing-library/react-native';
import { ScreenHeader } from '../ScreenHeader';
import { fonts } from '@/src/theme/type';

describe('ScreenHeader', () => {
  it('announces the title as a header in semibold', () => {
    render(<ScreenHeader title="Historial" />);
    const title = screen.getByRole('header', { name: 'Historial' });
    expect(title).toHaveStyle({ fontFamily: fonts.semibold });
  });

  it('renders no second line without a subtitle', () => {
    render(<ScreenHeader title="Historial" />);
    expect(screen.queryByTestId('screen-header-subtitle')).toBeNull();
  });

  it('renders the subtitle when it carries information', () => {
    render(<ScreenHeader title="Historial" subtitle="23 tickets" />);
    expect(screen.getByTestId('screen-header-subtitle')).toHaveTextContent('23 tickets');
  });
});
