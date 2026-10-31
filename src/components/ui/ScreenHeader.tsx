import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';

interface ScreenHeaderProps {
  title: string;
  /** Only for a line that tells the user something, such as a count. */
  subtitle?: string;
  action?: ReactNode;
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  const colors = useAppColors();

  return (
    <View className="flex-row items-start justify-between px-5 pt-4 pb-2">
      <View className="flex-1">
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, color: colors.text }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            testID="screen-header-subtitle"
            style={{
              fontFamily: fonts.regular,
              fontSize: 15,
              lineHeight: 20,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View className="ml-3">{action}</View> : null}
    </View>
  );
}
