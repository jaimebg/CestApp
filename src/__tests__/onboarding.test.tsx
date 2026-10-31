import { render, screen } from '@testing-library/react-native';
import OnboardingScreen from '@/app/onboarding';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('OnboardingScreen', () => {
  it('scrolls, so the sample ticket and controls fit short phones', () => {
    render(<OnboardingScreen />);
    expect(screen.getByTestId('onboarding-scroll')).toBeTruthy();
  });
});
