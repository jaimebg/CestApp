import { act, fireEvent, render, screen } from '@testing-library/react-native';
import AnalyticsScreen from '@/app/(tabs)/analytics';
import { getAnalyticsSummary, getPeriodComparison } from '@/src/db/queries/analytics';

jest.mock('@/src/components/ui/EmptyState', () => ({ EmptyState: () => null }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('react-native-gifted-charts', () => ({ BarChart: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/src/db/provider', () => ({ useDatabaseReady: () => ({ isReady: true }) }));
jest.mock('@/src/db/queries/analytics', () => ({
  getAnalyticsSummary: jest.fn(),
  getPeriodComparison: jest.fn(),
}));

const monthData = {
  total: 123.53,
  average: 24.71,
  receiptCount: 5,
  spendingByDay: [],
  spendingByCategory: [],
  spendingByStore: [],
};

describe('AnalyticsScreen', () => {
  it('keeps describing the period it is showing while the next one loads', async () => {
    jest.mocked(getAnalyticsSummary).mockResolvedValueOnce(monthData);
    jest.mocked(getPeriodComparison).mockResolvedValue({ current: 123.53, previous: 72.35 });

    render(<AnalyticsScreen />);
    await act(async () => {});
    expect(screen.getAllByText('This month')).toHaveLength(2);

    jest.mocked(getAnalyticsSummary).mockReturnValueOnce(new Promise(() => {}));
    fireEvent.press(screen.getByRole('button', { name: 'This year' }));
    await act(async () => {});

    expect(screen.getAllByText('This month')).toHaveLength(2);
    expect(screen.getAllByText('This year')).toHaveLength(1);
  });
});
