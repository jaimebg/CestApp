import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFormatPrice } from '../../store/preferences';

import { TicketLine, TicketRule } from './TicketLine';

interface ReceiptSummaryProps {
  subtotal?: number | null;
  tax?: number | null;
  discount?: number | null;
  total: number | null;
  /** ISO 4217 code the amounts are in. */
  currency: string;
}

export function ReceiptSummary({ subtotal, tax, discount, total, currency }: ReceiptSummaryProps) {
  const { t } = useTranslation();
  const { formatPrice } = useFormatPrice();

  return (
    <View>
      <TicketRule />
      {subtotal != null && (
        <TicketLine
          variant="subtotal"
          label={t('receipt.subtotal')}
          amount={formatPrice(subtotal / 100, currency)}
        />
      )}
      {tax != null && tax > 0 && (
        <TicketLine
          variant="subtotal"
          label={t('receipt.tax')}
          amount={formatPrice(tax / 100, currency)}
        />
      )}
      {discount != null && discount > 0 && (
        <TicketLine
          variant="subtotal"
          label={t('receipt.discount')}
          amount={`-${formatPrice(discount / 100, currency)}`}
        />
      )}
      <TicketLine
        variant="total"
        label={t('receipt.total')}
        amount={formatPrice(total ? total / 100 : null, currency)}
      />
    </View>
  );
}
