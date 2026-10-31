import type { ChainTemplate } from '../types';
import { ALCAMPO } from './chains/alcampo';
import { ALDI } from './chains/aldi';
import { CARREFOUR } from './chains/carrefour';
import { CONSUM } from './chains/consum';
import { DIA } from './chains/dia';
import { EROSKI } from './chains/eroski';
import { HIPERDINO } from './chains/hiperdino';
import { LIDL } from './chains/lidl';
import { MERCADONA } from './chains/mercadona';

export { SPAIN } from './country';

export const SPAIN_CHAINS: ChainTemplate[] = [
  MERCADONA,
  CARREFOUR,
  LIDL,
  EROSKI,
  DIA,
  CONSUM,
  ALCAMPO,
  ALDI,
  HIPERDINO,
];
