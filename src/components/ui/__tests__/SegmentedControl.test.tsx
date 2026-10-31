import { fireEvent, render, screen } from '@testing-library/react-native';
import { SegmentedControl } from '../SegmentedControl';
import { MIN_TARGET } from '@/src/theme/a11y';

const options = [
  { value: 'en' as const, label: 'EN' },
  { value: 'es' as const, label: 'ES' },
];

describe('SegmentedControl', () => {
  it('marks only the current option as selected', () => {
    render(
      <SegmentedControl
        options={options}
        value="en"
        onChange={jest.fn()}
        accessibilityLabel="Language"
      />
    );
    expect(screen.getByRole('button', { name: 'EN' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'ES' })).not.toBeSelected();
  });

  it('reports the option the user presses', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={options}
        value="en"
        onChange={onChange}
        accessibilityLabel="Language"
      />
    );
    fireEvent.press(screen.getByRole('button', { name: 'ES' }));
    expect(onChange).toHaveBeenCalledWith('es');
  });

  it('grows with large text instead of clipping it', () => {
    render(
      <SegmentedControl
        options={options}
        value="en"
        onChange={jest.fn()}
        accessibilityLabel="Language"
      />
    );
    const option = screen.getByRole('button', { name: 'EN' });
    expect(option).toHaveStyle({ minHeight: MIN_TARGET });
    expect(option).not.toHaveStyle({ height: MIN_TARGET });
  });
});
