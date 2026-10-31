import { Children, Fragment, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';
import { MIN_TARGET } from '@/src/theme/a11y';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

const ROW_PADDING = 16;

interface ListGroupProps {
  children: ReactNode;
  /** A quiet note under the group, such as what a setting implies. */
  footer?: string;
}

/** Rows on one surface, divided by hairlines instead of a card per row. */
export function ListGroup({ children, footer }: ListGroupProps) {
  const colors = useAppColors();
  const rows = Children.toArray(children).filter(Boolean);
  if (rows.length === 0) return null;

  return (
    <View>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View
                style={{
                  height: StyleSheet.hairlineWidth,
                  marginLeft: ROW_PADDING,
                  backgroundColor: colors.border,
                }}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 13,
            lineHeight: 18,
            color: colors.textTertiary,
            paddingHorizontal: ROW_PADDING,
            marginTop: 8,
          }}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

interface ListRowProps {
  title: string;
  description?: string;
  value?: string;
  icon?: IoniconName;
  chevron?: boolean;
  /** Error ink on the title only: no fill, no border. */
  destructive?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Work in progress on this row; it stays at full strength while others are disabled. */
  busy?: boolean;
  /** For rows that show or hide content below. */
  expanded?: boolean;
  /** Defaults to the title; pass one when the row carries more, like a value. */
  accessibilityLabel?: string;
  /** Defaults to the description. */
  accessibilityHint?: string;
  /** Sits at the trailing edge, e.g. a switch or a thumbnail. */
  accessory?: ReactNode;
  /** Sits under the title across the row, e.g. a segmented control. */
  children?: ReactNode;
}

export function ListRow({
  title,
  description,
  value,
  icon,
  chevron = false,
  destructive = false,
  onPress,
  disabled = false,
  busy = false,
  expanded,
  accessibilityLabel,
  accessibilityHint,
  accessory,
  children,
}: ListRowProps) {
  const colors = useAppColors();

  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={destructive ? colors.error : colors.textSecondary}
            style={{ marginRight: 12 }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 16,
              lineHeight: 22,
              color: destructive ? colors.error : colors.text,
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              style={{
                fontFamily: fonts.regular,
                fontSize: 13,
                lineHeight: 18,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 15,
              color: colors.textSecondary,
              marginLeft: 12,
            }}
          >
            {value}
          </Text>
        ) : null}
        {accessory ? <View style={{ marginLeft: 12 }}>{accessory}</View> : null}
        {chevron ? (
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textTertiary}
            style={{ marginLeft: 8 }}
          />
        ) : null}
      </View>
      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </>
  );

  const rowStyle = {
    minHeight: MIN_TARGET,
    justifyContent: 'center' as const,
    paddingHorizontal: ROW_PADDING,
    paddingVertical: 12,
  };

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint ?? description}
      accessibilityState={{ disabled, busy, expanded }}
      className="active:opacity-60"
      style={[rowStyle, disabled && !busy && { opacity: 0.5 }]}
    >
      {content}
    </Pressable>
  );
}
