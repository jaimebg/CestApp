import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useAppColors } from '@/src/hooks/useAppColors';
import { fonts } from '@/src/theme/type';
import { TicketRule } from './TicketLine';

const TOOTH_WIDTH = 8;
const TOOTH_HEIGHT = 6;

/** A row of triangles along a torn thermal-paper edge, filled in the ticket colour. */
function TornEdge({
  width,
  color,
  side,
}: {
  width: number;
  color: string;
  side: 'top' | 'bottom';
}) {
  if (width <= 0) return null;
  const teeth = Math.max(1, Math.round(width / TOOTH_WIDTH));
  const step = width / teeth;
  const base = side === 'top' ? TOOTH_HEIGHT : 0;
  const tip = side === 'top' ? 0 : TOOTH_HEIGHT;
  let d = `M0 ${base}`;
  for (let i = 0; i < teeth; i++) {
    d += ` L${(i + 0.5) * step} ${tip} L${(i + 1) * step} ${base}`;
  }
  d += ' Z';
  return (
    <Svg width={width} height={TOOTH_HEIGHT}>
      <Path d={d} fill={color} />
    </Svg>
  );
}

interface TicketProps {
  header?: { title: string; lines: string[] };
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * The receipt as printed: a strip of paper with torn edges, a centred heading
 * and columns of amounts. The app's first moment; nothing else draws paper.
 */
export function Ticket({ header, children, footer }: TicketProps) {
  const colors = useAppColors();
  const [width, setWidth] = useState(0);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <TornEdge width={width} color={colors.surface} side="top" />
      <View style={{ backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 16 }}>
        {header ? (
          <View style={{ alignItems: 'center' }}>
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: fonts.semibold,
                fontSize: 17,
                lineHeight: 22,
                color: colors.text,
                textAlign: 'center',
              }}
            >
              {header.title}
            </Text>
            {header.lines.map((line) => (
              <Text
                key={line}
                style={{
                  fontFamily: fonts.regular,
                  fontSize: 13,
                  lineHeight: 18,
                  color: colors.textSecondary,
                  textAlign: 'center',
                  marginTop: 2,
                }}
              >
                {line}
              </Text>
            ))}
            <View style={{ alignSelf: 'stretch' }}>
              <TicketRule />
            </View>
          </View>
        ) : null}
        {children}
        {footer}
      </View>
      <TornEdge width={width} color={colors.surface} side="bottom" />
    </View>
  );
}
