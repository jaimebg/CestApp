/**
 * Error boundary component for catching and handling React errors
 */

import { Component, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createScopedLogger } from '../utils/debug';
import { useIsDarkMode } from '../hooks/useAppColors';

const logger = createScopedLogger('ErrorBoundary');

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error);
    logger.error('Error info:', errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const isDark = useIsDarkMode();

  const colors = {
    background: isDark ? '#1A1918' : '#FFFDE1',
    surface: isDark ? '#2D2A26' : '#FFFFFF',
    text: isDark ? '#FFFDE1' : '#2D2A26',
    textSecondary: isDark ? '#B8B4A9' : '#6B6560',
    error: isDark ? '#C94444' : '#980404',
    primary: '#93BD57',
  };

  return (
    <View
      className="flex-1 justify-center items-center p-6"
      style={{ backgroundColor: colors.background }}
    >
      <View className="rounded-full p-4 mb-4" style={{ backgroundColor: colors.error + '20' }}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
      </View>

      <Text
        className="text-lg text-center mb-2"
        style={{ color: colors.text, fontFamily: 'Inter_600SemiBold' }}
      >
        Something went wrong
      </Text>

      <Text
        className="text-sm text-center mb-6"
        style={{ color: colors.textSecondary, fontFamily: 'Inter_400Regular' }}
      >
        {error?.message || 'An unexpected error occurred'}
      </Text>

      <Pressable
        onPress={onRetry}
        className="px-6 py-3 rounded-xl"
        style={{ backgroundColor: colors.primary }}
      >
        <Text className="text-base" style={{ color: '#FFFFFF', fontFamily: 'Inter_600SemiBold' }}>
          Try Again
        </Text>
      </Pressable>
    </View>
  );
}

export { ErrorBoundaryClass as ErrorBoundary, ErrorFallback };
