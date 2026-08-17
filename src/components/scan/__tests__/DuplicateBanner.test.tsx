import { fireEvent, render, screen } from '@testing-library/react-native';
import { DuplicateBanner } from '../DuplicateBanner';

// The real icon set loads its font asynchronously and settles after the test
// has finished, which surfaces as an act() warning unrelated to the assertions.
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

describe('DuplicateBanner', () => {
  it('names the day and total of the receipt already saved', () => {
    render(<DuplicateBanner dateLabel="17/08/2026" totalLabel="54,20 €" onView={jest.fn()} />);

    expect(screen.getByText('Already scanned')).toBeTruthy();
    expect(screen.getByText('Saved 17/08/2026, 54,20 €')).toBeTruthy();
  });

  it('calls onView when the action is pressed', () => {
    const onView = jest.fn();
    render(<DuplicateBanner dateLabel="17/08/2026" totalLabel="54,20 €" onView={onView} />);

    fireEvent.press(screen.getByText('View'));

    expect(onView).toHaveBeenCalledTimes(1);
  });
});
