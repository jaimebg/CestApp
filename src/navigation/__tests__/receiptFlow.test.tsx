import { Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { openSavedReceipt } from '../receiptFlow';

const SAVED_RECEIPT_ID = 42;

function StackLayout() {
  return <Stack />;
}

function DashboardScreen() {
  return <Text>dashboard</Text>;
}

function ScanTabScreen() {
  return <Text>scan tab</Text>;
}

function PreviewScreen() {
  return <Text>preview</Text>;
}

function ReviewScreen() {
  return <Text>review</Text>;
}

function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>receipt {id}</Text>;
}

/**
 * Mirrors the real route tree: a root stack holding the tabs, the scan flow and
 * the receipt detail, the latter two being nested stacks of their own.
 */
const ROUTES = {
  _layout: StackLayout,
  '(tabs)/_layout': StackLayout,
  '(tabs)/index': DashboardScreen,
  '(tabs)/scan': ScanTabScreen,
  'scan/_layout': StackLayout,
  'scan/preview': PreviewScreen,
  'scan/review': ReviewScreen,
  'receipt/_layout': StackLayout,
  'receipt/[id]': ReceiptDetailScreen,
};

/** The router state nests the real root stack under a synthetic `__root` route. */
function rootStackRoutes(rendered: ReturnType<typeof renderRouter>): string[] {
  const state = rendered.getRouterState();
  const root = state?.routes.find((r) => r.name === '__root') ?? state?.routes[0];
  return (root?.state?.routes ?? []).map((r) => r.name);
}

/** Walks the same path a user takes: scan tab -> preview -> review. */
function enterScanFlow() {
  const rendered = renderRouter(ROUTES, { initialUrl: '/(tabs)/scan' });

  act(() => router.push('/scan/preview'));
  act(() => router.push('/scan/review'));

  return rendered;
}

describe('openSavedReceipt', () => {
  it('reaches review with the scan flow stacked on the tabs', () => {
    const rendered = enterScanFlow();

    expect(rendered.getPathname()).toBe('/scan/review');
    expect(rootStackRoutes(rendered)).toEqual(['(tabs)', 'scan']);
  });

  it('lands on the saved receipt detail screen', () => {
    const rendered = enterScanFlow();

    act(() => openSavedReceipt(router, SAVED_RECEIPT_ID));

    expect(rendered.getPathname()).toBe(`/receipt/${SAVED_RECEIPT_ID}`);
    expect(screen.getByText(`receipt ${SAVED_RECEIPT_ID}`)).toBeTruthy();
  });

  it('leaves nothing of the scan flow in the root stack', () => {
    const rendered = enterScanFlow();

    act(() => openSavedReceipt(router, SAVED_RECEIPT_ID));

    expect(rootStackRoutes(rendered)).toEqual(['(tabs)', 'receipt']);
  });

  it('returns to the tabs on Back rather than re-entering the scan flow', () => {
    const rendered = enterScanFlow();

    act(() => openSavedReceipt(router, SAVED_RECEIPT_ID));
    act(() => router.back());

    expect(rendered.getPathname()).toBe('/scan');
    expect(screen.getByText('scan tab')).toBeTruthy();
    expect(screen.queryByText('review')).toBeNull();
    expect(screen.queryByText('preview')).toBeNull();
  });
});
