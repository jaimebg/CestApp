import type { OcrBlock } from '../index';

/**
 * Real OCR geometry for the reference Lidl receipts, captured from the source
 * images with Apple Vision.
 *
 * Lidl prints the product name and its price as two columns, so a recognizer
 * emits them as separate observations sharing a baseline. Blocks here are
 * clustered by column the way ML Kit segments the same layout, which is the
 * arrangement rowReconstructor exists to undo.
 *
 * The engine is Vision rather than ML Kit, so the segmentation is
 * representative rather than byte-identical to what the app sees on device.
 */
export interface PhotoFixture {
  dimensions: { width: number; height: number };
  blocks: OcrBlock[];
}

const lidlLosLlanos20240520: PhotoFixture = {
  dimensions: { width: 1077, height: 3984 },
  blocks: [
    {
      text: 'L\u1eacDI',
      boundingBox: { left: 466.7, top: 166.2, width: 148.1, height: 58.4 },
      lines: [
        { text: 'L\u1eacDI', boundingBox: { left: 466.7, top: 166.2, width: 148.1, height: 58.4 } },
      ],
    },
    {
      text: 'LIDL SUPERMERCADOS S.A.U\nC/ Ram\u00f3n Pol n\u00b0 7\n38768Los Llanos de Aridane, La Palna\nNIF A60195278\nwww.lidl-canarias.es\nAguas palna 81\nAgua 1,5 l\nCaracola de nueces\nFres\u00f3n 500 g\nChef Select/Lasa\u00f1a verdu\nChef Select/Lasa\u00f1a bolon\nConfiserie Firenze/Paste\nManzana Granny 1kg\nPl\u00e1tano Canar\u00edas\n1,328 kg x 1,95 EUR/kg\nPhoskitos 1972\nKania/Mayonesa 450ml\nChef Select/Arroz 3 deli\nLasa\u00f1a 5 quesos\nChef Select/Gyozas P 2,99x\nChef Select/Pizza famili\n1,20x\nLadr\u00f3n de Manzanas\nTotal\nEntregado\nCambio\nIGIC 0%',
      boundingBox: { left: 44.6, top: 516.5, width: 839.5, height: 1527.5 },
      lines: [
        {
          text: 'LIDL SUPERMERCADOS S.A.U',
          boundingBox: { left: 219.9, top: 516.5, width: 534.0, height: 44.9 },
        },
        {
          text: 'C/ Ram\u00f3n Pol n\u00b0 7',
          boundingBox: { left: 282.7, top: 570.0, width: 381.4, height: 41.0 },
        },
        {
          text: '38768Los Llanos de Aridane, La Palna',
          boundingBox: { left: 89.8, top: 624.0, width: 794.3, height: 50.0 },
        },
        {
          text: 'NIF A60195278',
          boundingBox: { left: 327.6, top: 673.7, width: 296.2, height: 40.4 },
        },
        {
          text: 'www.lidl-canarias.es',
          boundingBox: { left: 264.8, top: 723.1, width: 444.3, height: 44.9 },
        },
        {
          text: 'Aguas palna 81',
          boundingBox: { left: 44.9, top: 826.0, width: 314.1, height: 45.4 },
        },
        { text: 'Agua 1,5 l', boundingBox: { left: 44.6, top: 874.4, width: 229.5, height: 52.3 } },
        {
          text: 'Caracola de nueces',
          boundingBox: { left: 44.9, top: 925.0, width: 403.9, height: 45.2 },
        },
        {
          text: 'Fres\u00f3n 500 g',
          boundingBox: { left: 44.7, top: 978.3, width: 274.1, height: 51.2 },
        },
        {
          text: 'Chef Select/Lasa\u00f1a verdu',
          boundingBox: { left: 44.9, top: 1028.6, width: 534.0, height: 44.9 },
        },
        {
          text: 'Chef Select/Lasa\u00f1a bolon',
          boundingBox: { left: 44.9, top: 1082.0, width: 534.0, height: 41.0 },
        },
        {
          text: 'Confiserie Firenze/Paste',
          boundingBox: { left: 44.9, top: 1131.9, width: 534.0, height: 40.4 },
        },
        {
          text: 'Manzana Granny 1kg',
          boundingBox: { left: 44.9, top: 1185.8, width: 403.9, height: 45.2 },
        },
        {
          text: 'Pl\u00e1tano Canar\u00edas',
          boundingBox: { left: 44.9, top: 1235.0, width: 359.0, height: 41.0 },
        },
        {
          text: '1,328 kg x 1,95 EUR/kg',
          boundingBox: { left: 85.3, top: 1289.0, width: 534.0, height: 49.5 },
        },
        {
          text: 'Phoskitos 1972',
          boundingBox: { left: 44.9, top: 1338.0, width: 314.1, height: 41.0 },
        },
        {
          text: 'Kania/Mayonesa 450ml',
          boundingBox: { left: 44.9, top: 1387.9, width: 444.3, height: 45.1 },
        },
        {
          text: 'Chef Select/Arroz 3 deli',
          boundingBox: { left: 44.9, top: 1437.0, width: 529.5, height: 45.2 },
        },
        {
          text: 'Lasa\u00f1a 5 quesos',
          boundingBox: { left: 44.9, top: 1491.0, width: 336.6, height: 45.1 },
        },
        {
          text: 'Chef Select/Gyozas P 2,99x',
          boundingBox: { left: 44.9, top: 1540.6, width: 601.3, height: 49.4 },
        },
        {
          text: 'Chef Select/Pizza famili',
          boundingBox: { left: 44.9, top: 1590.0, width: 529.5, height: 40.4 },
        },
        { text: '1,20x', boundingBox: { left: 515.7, top: 1642.9, width: 130.9, height: 51.4 } },
        {
          text: 'Ladr\u00f3n de Manzanas',
          boundingBox: { left: 44.9, top: 1643.9, width: 466.7, height: 45.1 },
        },
        { text: 'Total', boundingBox: { left: 44.8, top: 1747.0, width: 116.8, height: 40.9 } },
        { text: 'Entregado', boundingBox: { left: 44.7, top: 1800.4, width: 206.7, height: 41.9 } },
        { text: 'Cambio', boundingBox: { left: 44.8, top: 1904.0, width: 139.3, height: 41.2 } },
        { text: 'IGIC 0%', boundingBox: { left: 457.7, top: 2003.0, width: 166.0, height: 41.0 } },
      ],
    },
    {
      text: '\u00a1Felicidades! Has conseguido\n3\nsobres EUR02024',
      boundingBox: { left: 201.9, top: 2155.9, width: 637.2, height: 94.3 },
      lines: [
        {
          text: '\u00a1Felicidades! Has conseguido',
          boundingBox: { left: 201.9, top: 2155.9, width: 614.8, height: 45.1 },
        },
        { text: '3', boundingBox: { left: 260.3, top: 2209.8, width: 35.9, height: 40.4 } },
        {
          text: 'sobres EUR02024',
          boundingBox: { left: 507.1, top: 2209.8, width: 332.1, height: 40.4 },
        },
      ],
    },
    {
      text: '0982\n677114/04\nDevoluciones art\u00edculos de bazar con\nticket de compra y embalaje original\nen un plazo m\u00e1ximo de 30 d\u00edas sin\nperjuicio de la ley de garant\u00edas.\nAtenci\u00f3n al Cliente - Tel.988958311\nwww.lidl-canarias.es/contacto\nCOMERCIO MINORISTA\nGRACIAS POR SU VISITA',
      boundingBox: { left: 44.3, top: 2361.3, width: 839.8, height: 450.7 },
      lines: [
        { text: '0982', boundingBox: { left: 44.3, top: 2361.3, width: 95.4, height: 47.5 } },
        {
          text: '677114/04',
          boundingBox: { left: 192.9, top: 2362.0, width: 211.1, height: 41.5 },
        },
        {
          text: 'Devoluciones art\u00edculos de bazar con',
          boundingBox: { left: 94.2, top: 2412.0, width: 771.8, height: 36.0 },
        },
        {
          text: 'ticket de compra y embalaje original',
          boundingBox: { left: 89.8, top: 2465.9, width: 794.3, height: 49.4 },
        },
        {
          text: 'en un plazo m\u00e1ximo de 30 d\u00edas sin',
          boundingBox: { left: 112.2, top: 2519.8, width: 731.5, height: 40.4 },
        },
        {
          text: 'perjuicio de la ley de garant\u00edas.',
          boundingBox: { left: 112.2, top: 2569.0, width: 727.0, height: 45.1 },
        },
        {
          text: 'Atenci\u00f3n al Cliente - Tel.988958311',
          boundingBox: { left: 89.8, top: 2618.6, width: 771.8, height: 44.9 },
        },
        {
          text: 'www.lidl-canarias.es/contacto',
          boundingBox: { left: 152.6, top: 2668.0, width: 646.2, height: 49.4 },
        },
        {
          text: 'COMERCIO MINORISTA',
          boundingBox: { left: 287.2, top: 2721.9, width: 399.4, height: 40.4 },
        },
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 242.3, top: 2775.8, width: 466.7, height: 36.2 },
        },
      ],
    },
    {
      text: 'GRACIAS POR SU VISITA',
      boundingBox: { left: 287.2, top: 3337.0, width: 439.8, height: 41.0 },
      lines: [
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 287.2, top: 3337.0, width: 439.8, height: 41.0 },
        },
      ],
    },
    {
      text: 'Compra realizada en\nCAN\u2022LP-Los Llanos de Aridane\nC/ Ram\u00f3n Pol, 7\n38760 Los Llanos de Aridane (La Palma)\nInformaci\u00f3n de la tienda \u203a',
      boundingBox: { left: 35.9, top: 3552.8, width: 691.1, height: 341.4 },
      lines: [
        {
          text: 'Compra realizada en',
          boundingBox: { left: 35.9, top: 3552.8, width: 457.7, height: 49.4 },
        },
        {
          text: 'CAN\u2022LP-Los Llanos de Aridane',
          boundingBox: { left: 35.9, top: 3651.6, width: 529.5, height: 40.4 },
        },
        {
          text: 'C/ Ram\u00f3n Pol, 7',
          boundingBox: { left: 35.9, top: 3705.5, width: 287.2, height: 44.9 },
        },
        {
          text: '38760 Los Llanos de Aridane (La Palma)',
          boundingBox: { left: 35.9, top: 3763.9, width: 691.1, height: 40.4 },
        },
        {
          text: 'Informaci\u00f3n de la tienda \u203a',
          boundingBox: { left: 40.4, top: 3849.0, width: 498.1, height: 45.2 },
        },
      ],
    },
    {
      text: 'EUR\n1,41\n8, 50\n2,59\n2,59\n2,89\n2.59\n5,99\n2,05\n2,59\n1,45\n1,08\n2,59\n3,29\n5,98\n5,49\n2,48\n45,48\n50,00\n-4,52',
      boundingBox: { left: 852.3, top: 777.0, width: 126.0, height: 1172.3 },
      lines: [
        { text: 'EUR', boundingBox: { left: 897.5, top: 777.0, width: 71.8, height: 35.9 } },
        { text: '1,41', boundingBox: { left: 875.1, top: 826.4, width: 94.2, height: 44.9 } },
        { text: '8, 50', boundingBox: { left: 875.1, top: 875.9, width: 98.7, height: 49.4 } },
        { text: '2,59', boundingBox: { left: 875.1, top: 929.7, width: 98.7, height: 49.4 } },
        { text: '2,59', boundingBox: { left: 875.1, top: 974.7, width: 103.2, height: 53.9 } },
        { text: '2,89', boundingBox: { left: 874.5, top: 1031.8, width: 99.8, height: 47.3 } },
        { text: '2.59', boundingBox: { left: 874.7, top: 1081.8, width: 94.9, height: 50.8 } },
        { text: '5,99', boundingBox: { left: 875.0, top: 1136.2, width: 94.4, height: 45.3 } },
        { text: '2,05', boundingBox: { left: 875.1, top: 1185.8, width: 98.7, height: 44.9 } },
        { text: '2,59', boundingBox: { left: 875.1, top: 1235.2, width: 94.2, height: 49.4 } },
        { text: '1,45', boundingBox: { left: 875.1, top: 1338.5, width: 94.2, height: 44.9 } },
        { text: '1,08', boundingBox: { left: 875.1, top: 1387.9, width: 98.7, height: 49.4 } },
        { text: '2,59', boundingBox: { left: 874.3, top: 1440.4, width: 95.7, height: 52.2 } },
        { text: '3,29', boundingBox: { left: 875.1, top: 1491.2, width: 94.2, height: 44.9 } },
        { text: '5,98', boundingBox: { left: 875.0, top: 1540.4, width: 98.9, height: 49.7 } },
        { text: '5,49', boundingBox: { left: 875.0, top: 1594.4, width: 98.8, height: 45.1 } },
        { text: '2,48', boundingBox: { left: 875.1, top: 1643.9, width: 94.2, height: 49.4 } },
        { text: '45,48', boundingBox: { left: 852.6, top: 1751.7, width: 116.7, height: 44.9 } },
        { text: '50,00', boundingBox: { left: 852.3, top: 1800.4, width: 117.3, height: 50.9 } },
        { text: '-4,52', boundingBox: { left: 852.6, top: 1904.4, width: 116.7, height: 44.9 } },
      ],
    },
    {
      text: '20.05.24 13:00',
      boundingBox: { left: 610.3, top: 2362.6, width: 359.0, height: 44.9 },
      lines: [
        {
          text: '20.05.24 13:00',
          boundingBox: { left: 610.3, top: 2362.6, width: 359.0, height: 44.9 },
        },
      ],
    },
  ],
};

const lidlLosLlanos20231226: PhotoFixture = {
  dimensions: { width: 1077, height: 5050 },
  blocks: [
    {
      text: 'L$DI',
      boundingBox: { left: 466.7, top: 166.1, width: 148.1, height: 53.9 },
      lines: [
        { text: 'L$DI', boundingBox: { left: 466.7, top: 166.1, width: 148.1, height: 53.9 } },
      ],
    },
    {
      text: 'LIDL SUPERMERCADOS S.A.U\nC/ Ran\u00f3n Pol n* 7\n38760Los Llanos de Aridane, La Palna\nNIF AS0195278\nwww.lid1-canarias.es\nMilbona/Leche sin la 0,99x\n-/Cuartos traseros\n1,527 kg x 3.49\nEUR/kg\nBelbake/Marina de trigo\nLa Robla/Sidra de Asturi\nFreshona/Uvas sin pe 0,89x\nCrownfield/Copos de aven\nNixe/Salm\u00f3n al natural\nAr\u00e1ndano 150 g\nMilbona/Ennental rallado\nPiniento rojo kg\n0.504 kg x 2.25 EVR/kg\nChef Select/Masa fre 1,79x\nRealvalle/Jan\u00f3n cocido e\nPiniento verde\n0,156 kg x 2,59 EUR/kg\n1,99x 2\nCebolla 1 Kg\nCombino/Fideo fino\nSolevita/Kombucha 11m\u00f3n\nAgua 1,51\nAlesto Selection/Noe 2,09x 2\n\u0420\u0430\u0440a\u0443a\n0,814 kg x 1,75 EUR/kg\nLa Cestera/Picatostes\nPuerro 5009\nManzana Granny 1kg\nMandarina granel\nEUR/kg\n0,866 kg x 2,19\nNaranja para zuno\nEUR/kg\n1,526 kg x 1.89\nChef Select/Gyoza de 3,49x\nAlesto Selection/Ar\u00e1 2,25x\nOrlando/Coeida para perr\nTotal\nTarjeta\n834790477\nA0000000831010\nVENTA Visa CaixaBank\n476664X000XX3965\n26/12/2823\nINP.: 68,62 EUR\nRECIBO PARA EL CLIENTE',
      boundingBox: { left: 40.4, top: 543.2, width: 839.2, height: 2599.3 },
      lines: [
        {
          text: 'LIDL SUPERMERCADOS S.A.U',
          boundingBox: { left: 215.4, top: 543.2, width: 538.5, height: 40.5 },
        },
        {
          text: 'C/ Ran\u00f3n Pol n* 7',
          boundingBox: { left: 282.7, top: 592.4, width: 381.4, height: 45.1 },
        },
        {
          text: '38760Los Llanos de Aridane, La Palna',
          boundingBox: { left: 89.8, top: 646.3, width: 789.8, height: 50.1 },
        },
        {
          text: 'NIF AS0195278',
          boundingBox: { left: 327.6, top: 695.8, width: 296.2, height: 40.7 },
        },
        {
          text: 'www.lid1-canarias.es',
          boundingBox: { left: 269.3, top: 745.2, width: 439.8, height: 44.9 },
        },
        {
          text: 'Milbona/Leche sin la 0,99x',
          boundingBox: { left: 44.9, top: 847.9, width: 601.3, height: 50.1 },
        },
        {
          text: '-/Cuartos traseros',
          boundingBox: { left: 44.9, top: 901.8, width: 403.9, height: 41.3 },
        },
        {
          text: '1,527 kg x 3.49',
          boundingBox: { left: 89.8, top: 951.6, width: 372.5, height: 49.4 },
        },
        { text: 'EUR/kg', boundingBox: { left: 457.7, top: 951.6, width: 161.6, height: 44.9 } },
        {
          text: 'Belbake/Marina de trigo',
          boundingBox: { left: 44.9, top: 1005.5, width: 511.6, height: 45.3 },
        },
        {
          text: 'La Robla/Sidra de Asturi',
          boundingBox: { left: 40.4, top: 1054.6, width: 538.5, height: 40.7 },
        },
        {
          text: 'Freshona/Uvas sin pe 0,89x',
          boundingBox: { left: 44.9, top: 1108.4, width: 659.7, height: 50.1 },
        },
        {
          text: 'Crownfield/Copos de aven',
          boundingBox: { left: 44.9, top: 1158.1, width: 534.0, height: 45.5 },
        },
        {
          text: 'Nixe/Salm\u00f3n al natural',
          boundingBox: { left: 44.9, top: 1207.4, width: 489.1, height: 40.5 },
        },
        {
          text: 'Ar\u00e1ndano 150 g',
          boundingBox: { left: 44.9, top: 1261.2, width: 314.1, height: 45.1 },
        },
        {
          text: 'Milbona/Ennental rallado',
          boundingBox: { left: 44.9, top: 1310.8, width: 534.0, height: 40.7 },
        },
        {
          text: 'Piniento rojo kg',
          boundingBox: { left: 44.9, top: 1360.1, width: 359.0, height: 49.4 },
        },
        {
          text: '0.504 kg x 2.25 EVR/kg',
          boundingBox: { left: 85.3, top: 1414.0, width: 538.5, height: 49.4 },
        },
        {
          text: 'Chef Select/Masa fre 1,79x',
          boundingBox: { left: 44.5, top: 1453.3, width: 602.3, height: 60.9 },
        },
        {
          text: 'Realvalle/Jan\u00f3n cocido e',
          boundingBox: { left: 44.9, top: 1516.8, width: 538.5, height: 45.4 },
        },
        {
          text: 'Piniento verde',
          boundingBox: { left: 44.9, top: 1566.6, width: 314.1, height: 40.4 },
        },
        {
          text: '0,156 kg x 2,59 EUR/kg',
          boundingBox: { left: 85.3, top: 1615.7, width: 538.5, height: 54.2 },
        },
        { text: '1,99x 2', boundingBox: { left: 529.3, top: 1668.5, width: 198.0, height: 43.1 } },
        {
          text: 'Cebolla 1 Kg',
          boundingBox: { left: 44.9, top: 1669.6, width: 273.7, height: 45.2 },
        },
        {
          text: 'Combino/Fideo fino',
          boundingBox: { left: 44.9, top: 1719.2, width: 403.9, height: 40.5 },
        },
        {
          text: 'Solevita/Kombucha 11m\u00f3n',
          boundingBox: { left: 44.9, top: 1768.5, width: 511.6, height: 40.5 },
        },
        { text: 'Agua 1,51', boundingBox: { left: 44.9, top: 1818.0, width: 228.9, height: 54.5 } },
        {
          text: 'Alesto Selection/Noe 2,09x 2',
          boundingBox: { left: 44.9, top: 1871.9, width: 686.6, height: 49.4 },
        },
        {
          text: '\u0420\u0430\u0440a\u0443a',
          boundingBox: { left: 44.8, top: 1925.6, width: 139.2, height: 45.2 },
        },
        {
          text: '0,814 kg x 1,75 EUR/kg',
          boundingBox: { left: 85.3, top: 1975.1, width: 538.5, height: 49.4 },
        },
        {
          text: 'La Cestera/Picatostes',
          boundingBox: { left: 44.9, top: 2029.0, width: 466.7, height: 40.4 },
        },
        {
          text: 'Puerro 5009',
          boundingBox: { left: 43.5, top: 2072.0, width: 254.4, height: 57.0 },
        },
        {
          text: 'Manzana Granny 1kg',
          boundingBox: { left: 44.9, top: 2131.7, width: 403.9, height: 41.3 },
        },
        {
          text: 'Mandarina granel',
          boundingBox: { left: 44.9, top: 2176.8, width: 359.0, height: 50.1 },
        },
        { text: 'EUR/kg', boundingBox: { left: 480.0, top: 2230.5, width: 139.4, height: 45.9 } },
        {
          text: '0,866 kg x 2,19',
          boundingBox: { left: 89.8, top: 2230.7, width: 336.6, height: 45.2 },
        },
        {
          text: 'Naranja para zuno',
          boundingBox: { left: 44.9, top: 2284.5, width: 377.0, height: 45.2 },
        },
        { text: 'EUR/kg', boundingBox: { left: 480.2, top: 2334.2, width: 143.6, height: 44.9 } },
        {
          text: '1,526 kg x 1.89',
          boundingBox: { left: 89.8, top: 2334.2, width: 336.6, height: 49.4 },
        },
        {
          text: 'Chef Select/Gyoza de 3,49x',
          boundingBox: { left: 44.9, top: 2383.5, width: 601.3, height: 50.1 },
        },
        {
          text: 'Alesto Selection/Ar\u00e1 2,25x',
          boundingBox: { left: 44.9, top: 2433.0, width: 601.3, height: 49.4 },
        },
        {
          text: 'Orlando/Coeida para perr',
          boundingBox: { left: 44.9, top: 2491.2, width: 534.0, height: 40.6 },
        },
        { text: 'Total', boundingBox: { left: 44.9, top: 2590.1, width: 116.7, height: 40.4 } },
        { text: 'Tarjeta', boundingBox: { left: 44.6, top: 2638.4, width: 162.1, height: 47.1 } },
        { text: '834790477', boundingBox: { left: 44.8, top: 2791.8, width: 206.5, height: 41.0 } },
        {
          text: 'A0000000831010',
          boundingBox: { left: 44.9, top: 2841.5, width: 318.6, height: 40.4 },
        },
        {
          text: 'VENTA Visa CaixaBank',
          boundingBox: { left: 44.9, top: 2895.3, width: 444.3, height: 40.5 },
        },
        {
          text: '476664X000XX3965',
          boundingBox: { left: 44.9, top: 2949.2, width: 359.0, height: 40.4 },
        },
        {
          text: '26/12/2823',
          boundingBox: { left: 44.8, top: 2998.3, width: 229.0, height: 45.5 },
        },
        {
          text: 'INP.: 68,62 EUR',
          boundingBox: { left: 44.9, top: 3048.0, width: 336.6, height: 49.4 },
        },
        {
          text: 'RECIBO PARA EL CLIENTE',
          boundingBox: { left: 242.3, top: 3101.8, width: 489.1, height: 40.7 },
        },
      ],
    },
    {
      text: 'IGIC es',
      boundingBox: { left: 462.0, top: 3253.6, width: 161.9, height: 37.7 },
      lines: [
        { text: 'IGIC es', boundingBox: { left: 462.0, top: 3253.6, width: 161.9, height: 37.7 } },
      ],
    },
    {
      text: '452642/87\n0982\nDevoluciones art\u00edculos de bazar con\nticket de compra y esbalaje original\nen un plazo m\u00e1xino de 38 d\u00edas sin\nperjuieio de la ley de garant\u00edas.\nAtenci\u00f3n al Cliente - Tel.909958311\nw.11d1-canarias.es/contacto\nCOMERCIO MINORISTA\nGRACIAS POR SU VISITA',
      boundingBox: { left: 44.9, top: 3406.3, width: 839.4, height: 450.1 },
      lines: [
        {
          text: '452642/87',
          boundingBox: { left: 197.3, top: 3406.3, width: 206.7, height: 42.0 },
        },
        { text: '0982', boundingBox: { left: 44.9, top: 3407.1, width: 94.2, height: 40.4 } },
        {
          text: 'Devoluciones art\u00edculos de bazar con',
          boundingBox: { left: 89.8, top: 3456.4, width: 771.8, height: 45.5 },
        },
        {
          text: 'ticket de compra y esbalaje original',
          boundingBox: { left: 89.5, top: 3505.6, width: 794.8, height: 56.6 },
        },
        {
          text: 'en un plazo m\u00e1xino de 38 d\u00edas sin',
          boundingBox: { left: 112.2, top: 3559.5, width: 727.0, height: 45.1 },
        },
        {
          text: 'perjuieio de la ley de garant\u00edas.',
          boundingBox: { left: 112.2, top: 3609.1, width: 727.0, height: 49.4 },
        },
        {
          text: 'Atenci\u00f3n al Cliente - Tel.909958311',
          boundingBox: { left: 89.8, top: 3658.4, width: 771.8, height: 45.1 },
        },
        {
          text: 'w.11d1-canarias.es/contacto',
          boundingBox: { left: 197.5, top: 3712.3, width: 601.3, height: 44.9 },
        },
        {
          text: 'COMERCIO MINORISTA',
          boundingBox: { left: 287.2, top: 3766.2, width: 399.4, height: 40.4 },
        },
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 242.3, top: 3815.1, width: 466.7, height: 41.3 },
        },
      ],
    },
    {
      text: 'GRACIAS POR SU VISITA',
      boundingBox: { left: 287.2, top: 4403.6, width: 444.3, height: 45.2 },
      lines: [
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 287.2, top: 4403.6, width: 444.3, height: 45.2 },
        },
      ],
    },
    {
      text: 'Compra realizada en\nCAN-LP-Los Llanos de Aridane\nC/ Ram\u00f3n Pol,7\n38760 Los Llanos de Aridane (La Palma)\nInformaci\u00f3n de la tienda >',
      boundingBox: { left: 35.7, top: 4619.1, width: 691.3, height: 350.1 },
      lines: [
        {
          text: 'Compra realizada en',
          boundingBox: { left: 35.9, top: 4619.1, width: 457.7, height: 53.9 },
        },
        {
          text: 'CAN-LP-Los Llanos de Aridane',
          boundingBox: { left: 35.9, top: 4717.8, width: 529.5, height: 40.4 },
        },
        {
          text: 'C/ Ram\u00f3n Pol,7',
          boundingBox: { left: 35.7, top: 4770.6, width: 292.1, height: 51.6 },
        },
        {
          text: '38760 Los Llanos de Aridane (La Palma)',
          boundingBox: { left: 35.9, top: 4834.5, width: 691.1, height: 40.4 },
        },
        {
          text: 'Informaci\u00f3n de la tienda >',
          boundingBox: { left: 35.9, top: 4919.7, width: 502.6, height: 49.5 },
        },
      ],
    },
    {
      text: 'EUR\n5,94\n6\n5,33\n0,69\n1,45\n2,67\n0,95\n3,79\n2,99\n1,95\n1,13\n3,58\n2\n2,49\n0.40\n3,98\n1,09\n1,75\n0,50\n4,18\n1,42\n0,59\n2,45\n2,05\n1,90\n2,83\n2\n6.98\n2\n4,50\n0,99\n68,62\n68,62\n00004001\ne0\n271581\n12:43:39',
      boundingBox: { left: 700.0, top: 790.0, width: 273.7, height: 2253.9 },
      lines: [
        { text: 'EUR', boundingBox: { left: 893.0, top: 790.0, width: 80.8, height: 49.4 } },
        { text: '5,94', boundingBox: { left: 875.1, top: 852.9, width: 94.2, height: 44.9 } },
        { text: '6', boundingBox: { left: 704.5, top: 852.9, width: 26.9, height: 31.4 } },
        { text: '5,33', boundingBox: { left: 875.1, top: 902.3, width: 94.2, height: 44.9 } },
        { text: '0,69', boundingBox: { left: 870.6, top: 996.5, width: 103.2, height: 53.9 } },
        { text: '1,45', boundingBox: { left: 875.1, top: 1054.9, width: 98.7, height: 49.4 } },
        { text: '2,67', boundingBox: { left: 875.1, top: 1108.8, width: 94.2, height: 44.9 } },
        { text: '0,95', boundingBox: { left: 875.0, top: 1157.9, width: 94.4, height: 45.3 } },
        { text: '3,79', boundingBox: { left: 875.1, top: 1207.5, width: 94.2, height: 49.4 } },
        { text: '2,99', boundingBox: { left: 875.1, top: 1261.4, width: 94.2, height: 49.4 } },
        { text: '1,95', boundingBox: { left: 874.9, top: 1310.4, width: 94.6, height: 45.6 } },
        { text: '1,13', boundingBox: { left: 875.1, top: 1360.1, width: 94.2, height: 49.4 } },
        { text: '3,58', boundingBox: { left: 875.1, top: 1467.9, width: 98.7, height: 44.9 } },
        { text: '2', boundingBox: { left: 700.0, top: 1467.9, width: 26.9, height: 31.4 } },
        { text: '2,49', boundingBox: { left: 875.1, top: 1517.2, width: 94.2, height: 44.9 } },
        { text: '0.40', boundingBox: { left: 875.1, top: 1566.6, width: 94.2, height: 49.4 } },
        { text: '3,98', boundingBox: { left: 875.1, top: 1669.9, width: 94.2, height: 44.9 } },
        { text: '1,09', boundingBox: { left: 875.1, top: 1719.2, width: 98.7, height: 49.4 } },
        { text: '1,75', boundingBox: { left: 875.1, top: 1773.1, width: 94.2, height: 40.4 } },
        { text: '0,50', boundingBox: { left: 875.1, top: 1822.5, width: 94.2, height: 44.9 } },
        { text: '4,18', boundingBox: { left: 875.1, top: 1876.4, width: 94.2, height: 44.9 } },
        { text: '1,42', boundingBox: { left: 875.1, top: 1925.7, width: 94.2, height: 49.4 } },
        { text: '0,59', boundingBox: { left: 875.1, top: 2029.0, width: 94.2, height: 49.4 } },
        { text: '2,45', boundingBox: { left: 875.1, top: 2078.4, width: 98.7, height: 49.4 } },
        { text: '2,05', boundingBox: { left: 874.6, top: 2131.3, width: 95.1, height: 46.7 } },
        { text: '1,90', boundingBox: { left: 874.6, top: 2180.6, width: 95.2, height: 46.9 } },
        { text: '2,83', boundingBox: { left: 875.1, top: 2284.8, width: 94.2, height: 49.4 } },
        { text: '2', boundingBox: { left: 700.1, top: 2383.6, width: 31.4, height: 40.4 } },
        { text: '6.98', boundingBox: { left: 875.1, top: 2383.6, width: 94.2, height: 49.4 } },
        { text: '2', boundingBox: { left: 704.5, top: 2433.0, width: 26.9, height: 35.9 } },
        { text: '4,50', boundingBox: { left: 875.1, top: 2437.5, width: 94.2, height: 44.9 } },
        { text: '0,99', boundingBox: { left: 875.1, top: 2491.3, width: 94.2, height: 44.9 } },
        { text: '68,62', boundingBox: { left: 852.6, top: 2590.1, width: 116.7, height: 44.9 } },
        { text: '68,62', boundingBox: { left: 852.4, top: 2638.9, width: 117.1, height: 46.0 } },
        { text: '00004001', boundingBox: { left: 744.9, top: 2792.1, width: 179.5, height: 40.4 } },
        { text: 'e0', boundingBox: { left: 875.1, top: 2846.0, width: 53.9, height: 35.9 } },
        { text: '271581', boundingBox: { left: 785.2, top: 2948.8, width: 139.3, height: 41.2 } },
        { text: '12:43:39', boundingBox: { left: 744.8, top: 2998.1, width: 184.2, height: 45.9 } },
      ],
    },
    {
      text: '26.12.23 12:42',
      boundingBox: { left: 610.3, top: 3406.7, width: 359.0, height: 45.2 },
      lines: [
        {
          text: '26.12.23 12:42',
          boundingBox: { left: 610.3, top: 3406.7, width: 359.0, height: 45.2 },
        },
      ],
    },
  ],
};

const lidlLosLlanos20231224: PhotoFixture = {
  dimensions: { width: 1077, height: 5172 },
  blocks: [
    {
      text: 'L\u1eacDL',
      boundingBox: { left: 471.2, top: 170.6, width: 148.1, height: 53.9 },
      lines: [
        { text: 'L\u1eacDL', boundingBox: { left: 471.2, top: 170.6, width: 148.1, height: 53.9 } },
      ],
    },
    {
      text: "LIDL SUPERMERCADOS S.A.U\nC/ Ram\u00f3n Pol n\u00b0 7\n38764Los Llanos de Aridane, La Palma\nNIF A60195278\nwww.l1d1-canarias.es\nFloralys/Papel higienico\nOto. Lid1 Plus\n2.05x 2\nSidra fresa y lina\nOto. L1d1 Plus\nLay's cheese\nOto. L101 Plus\nOto. Lid1 Plus\n0,99x 2\nMilbona/Leche sin la\nOto. L1d1 Plus\nMabichuela redonda\nDto. L101 Plus\nAlesto Selection/Nueces\nDto. L101 Plus\nNaranja 2 kg\nDto. L1d1 Plus\nCien/Gel afeitar\nDto. L1d1 Plus\nTonate rana\n0,596 kg x 2,85 EUR/kg\nDto. L101 Plus\nCampo Largo/Lentejas lan\nDto. L101 Plus\nKania/Azafr\u00e1n\nOto. Lidi Plus\nAlesto Selection/Almendr\nDto. Lid1 Plus\nSnack Day/Cocktail picot\nOto. Lid1 Plus\nAerocell/P1las alcal AA\nDto. L1d1 Plus\nZanahor1a\nDto. L101 Plus\nAronata/Bolsas bocadillo\nDto. L101 Plus\nCien/Protector labial\nDto. L1d1 Plus\nMilbona/Yogur natural\nOto. Lid1 Plus\nTotal\nEntregado\nCamb1o\nIGIC es",
      boundingBox: { left: 40.3, top: 547.7, width: 843.7, height: 2604.5 },
      lines: [
        {
          text: 'LIDL SUPERMERCADOS S.A.U',
          boundingBox: { left: 219.9, top: 547.7, width: 538.5, height: 40.4 },
        },
        {
          text: 'C/ Ram\u00f3n Pol n\u00b0 7',
          boundingBox: { left: 282.7, top: 597.1, width: 385.9, height: 44.9 },
        },
        {
          text: '38764Los Llanos de Aridane, La Palma',
          boundingBox: { left: 89.8, top: 651.0, width: 794.3, height: 49.4 },
        },
        {
          text: 'NIF A60195278',
          boundingBox: { left: 332.1, top: 700.4, width: 291.7, height: 40.4 },
        },
        {
          text: 'www.l1d1-canarias.es',
          boundingBox: { left: 269.2, top: 754.3, width: 444.3, height: 40.4 },
        },
        {
          text: 'Floralys/Papel higienico',
          boundingBox: { left: 44.9, top: 857.5, width: 538.5, height: 44.9 },
        },
        {
          text: 'Oto. Lid1 Plus',
          boundingBox: { left: 157.1, top: 906.9, width: 314.1, height: 40.4 },
        },
        { text: '2.05x 2', boundingBox: { left: 524.1, top: 947.6, width: 217.3, height: 62.2 } },
        {
          text: 'Sidra fresa y lina',
          boundingBox: { left: 44.9, top: 956.3, width: 403.9, height: 44.9 },
        },
        {
          text: 'Oto. L1d1 Plus',
          boundingBox: { left: 157.1, top: 1005.7, width: 314.1, height: 50.0 },
        },
        {
          text: "Lay's cheese",
          boundingBox: { left: 40.3, top: 1054.7, width: 278.4, height: 50.1 },
        },
        {
          text: 'Oto. L101 Plus',
          boundingBox: { left: 152.6, top: 1113.4, width: 318.6, height: 44.9 },
        },
        {
          text: 'Oto. Lid1 Plus',
          boundingBox: { left: 157.1, top: 1162.8, width: 314.1, height: 45.5 },
        },
        { text: '0,99x 2', boundingBox: { left: 525.0, top: 1212.0, width: 211.0, height: 54.3 } },
        {
          text: 'Milbona/Leche sin la',
          boundingBox: { left: 44.9, top: 1212.2, width: 471.2, height: 44.9 },
        },
        {
          text: 'Oto. L1d1 Plus',
          boundingBox: { left: 152.6, top: 1266.1, width: 318.6, height: 40.4 },
        },
        {
          text: 'Mabichuela redonda',
          boundingBox: { left: 44.9, top: 1315.4, width: 403.9, height: 45.5 },
        },
        {
          text: 'Dto. L101 Plus',
          boundingBox: { left: 152.6, top: 1369.3, width: 318.6, height: 45.5 },
        },
        {
          text: 'Alesto Selection/Nueces',
          boundingBox: { left: 44.9, top: 1418.7, width: 511.6, height: 40.4 },
        },
        {
          text: 'Dto. L101 Plus',
          boundingBox: { left: 157.1, top: 1472.6, width: 314.1, height: 44.9 },
        },
        {
          text: 'Naranja 2 kg',
          boundingBox: { left: 44.9, top: 1526.5, width: 278.2, height: 40.4 },
        },
        {
          text: 'Dto. L1d1 Plus',
          boundingBox: { left: 157.1, top: 1575.8, width: 314.1, height: 40.4 },
        },
        {
          text: 'Cien/Gel afeitar',
          boundingBox: { left: 44.9, top: 1620.7, width: 359, height: 44.9 },
        },
        {
          text: 'Dto. L1d1 Plus',
          boundingBox: { left: 152.6, top: 1679.1, width: 318.6, height: 40.4 },
        },
        {
          text: 'Tonate rana',
          boundingBox: { left: 44.9, top: 1728.5, width: 246.8, height: 40.4 },
        },
        {
          text: '0,596 kg x 2,85 EUR/kg',
          boundingBox: { left: 89.7, top: 1777.9, width: 534.0, height: 44.9 },
        },
        {
          text: 'Dto. L101 Plus',
          boundingBox: { left: 157.1, top: 1827.3, width: 314.1, height: 45.5 },
        },
        {
          text: 'Campo Largo/Lentejas lan',
          boundingBox: { left: 44.9, top: 1881.1, width: 534.0, height: 49.4 },
        },
        {
          text: 'Dto. L101 Plus',
          boundingBox: { left: 157.1, top: 1935.0, width: 314.1, height: 40.4 },
        },
        {
          text: 'Kania/Azafr\u00e1n',
          boundingBox: { left: 44.9, top: 1984.4, width: 296.2, height: 40.4 },
        },
        {
          text: 'Oto. Lidi Plus',
          boundingBox: { left: 152.6, top: 2033.8, width: 318.6, height: 44.9 },
        },
        {
          text: 'Alesto Selection/Almendr',
          boundingBox: { left: 44.9, top: 2087.7, width: 534.0, height: 40.4 },
        },
        {
          text: 'Dto. Lid1 Plus',
          boundingBox: { left: 157.1, top: 2137.0, width: 314.1, height: 40.4 },
        },
        {
          text: 'Snack Day/Cocktail picot',
          boundingBox: { left: 44.9, top: 2186.4, width: 534.0, height: 49.4 },
        },
        {
          text: 'Oto. Lid1 Plus',
          boundingBox: { left: 157.1, top: 2235.8, width: 314.1, height: 44.9 },
        },
        {
          text: 'Aerocell/P1las alcal AA',
          boundingBox: { left: 44.9, top: 2294.2, width: 511.6, height: 40.4 },
        },
        {
          text: 'Dto. L1d1 Plus',
          boundingBox: { left: 152.6, top: 2343.6, width: 318.6, height: 40.4 },
        },
        { text: 'Zanahor1a', boundingBox: { left: 44.9, top: 2397.4, width: 206.4, height: 35.9 } },
        {
          text: 'Dto. L101 Plus',
          boundingBox: { left: 157.1, top: 2446.8, width: 314.1, height: 40.4 },
        },
        {
          text: 'Aronata/Bolsas bocadillo',
          boundingBox: { left: 44.9, top: 2496.2, width: 538.5, height: 44.9 },
        },
        {
          text: 'Dto. L101 Plus',
          boundingBox: { left: 157.1, top: 2550.1, width: 314.1, height: 40.4 },
        },
        {
          text: 'Cien/Protector labial',
          boundingBox: { left: 44.9, top: 2595.0, width: 471.2, height: 44.9 },
        },
        {
          text: 'Dto. L1d1 Plus',
          boundingBox: { left: 157.1, top: 2648.9, width: 314.1, height: 44.9 },
        },
        {
          text: 'Milbona/Yogur natural',
          boundingBox: { left: 44.9, top: 2702.7, width: 466.7, height: 44.9 },
        },
        {
          text: 'Oto. Lid1 Plus',
          boundingBox: { left: 152.6, top: 2752.1, width: 318.6, height: 45.5 },
        },
        { text: 'Total', boundingBox: { left: 44.9, top: 2855.4, width: 116.7, height: 40.4 } },
        { text: 'Entregado', boundingBox: { left: 44.8, top: 2908.8, width: 206.6, height: 45.8 } },
        { text: 'Camb1o', boundingBox: { left: 44.6, top: 3011.4, width: 144.2, height: 38.2 } },
        { text: 'IGIC es', boundingBox: { left: 462.1, top: 3110.8, width: 161.8, height: 41.5 } },
      ],
    },
    {
      text: 'Gracias a Lid1 Plus has ahorrado\n5,39 EUR en esta compra\n8982 350679/83\nDevoluciones art\u00edculos de bazar con\nticket de compra y enbalaje original\nen un plazo n\u00e1xino de 30 dias sin\nperjuicio de la ley de garant\u00edas.\nAtenci\u00f3n al Cliente - Tel.900958311\nwww.l1d1-canar1as.es/contacto\nCOMERCIO MINORISTA\nGRACIAS POR SU VISITA',
      boundingBox: { left: 44.9, top: 3317.8, width: 843.7, height: 660.0 },
      lines: [
        {
          text: 'Gracias a Lid1 Plus has ahorrado',
          boundingBox: { left: 130.1, top: 3317.8, width: 713.5, height: 40.4 },
        },
        {
          text: '5,39 EUR en esta compra',
          boundingBox: { left: 224.4, top: 3367.2, width: 511.6, height: 44.9 },
        },
        {
          text: '8982 350679/83',
          boundingBox: { left: 44.9, top: 3519.8, width: 359, height: 44.9 },
        },
        {
          text: 'Devoluciones art\u00edculos de bazar con',
          boundingBox: { left: 89.8, top: 3573.7, width: 776.3, height: 40.4 },
        },
        {
          text: 'ticket de compra y enbalaje original',
          boundingBox: { left: 89.8, top: 3623.1, width: 798.8, height: 49.4 },
        },
        {
          text: 'en un plazo n\u00e1xino de 30 dias sin',
          boundingBox: { left: 112.2, top: 3677.0, width: 731.5, height: 45.5 },
        },
        {
          text: 'perjuicio de la ley de garant\u00edas.',
          boundingBox: { left: 112.2, top: 3726.4, width: 731.5, height: 49.4 },
        },
        {
          text: 'Atenci\u00f3n al Cliente - Tel.900958311',
          boundingBox: { left: 89.8, top: 3775.7, width: 776.3, height: 44.9 },
        },
        {
          text: 'www.l1d1-canar1as.es/contacto',
          boundingBox: { left: 157.1, top: 3829.6, width: 646.2, height: 44.9 },
        },
        {
          text: 'COMERCIO MINORISTA',
          boundingBox: { left: 287.2, top: 3879.0, width: 403.9, height: 40.4 },
        },
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 242.3, top: 3928.4, width: 471.2, height: 49.4 },
        },
      ],
    },
    {
      text: 'GRACIAS POR SU VISITA',
      boundingBox: { left: 291.7, top: 4525.5, width: 439.8, height: 40.4 },
      lines: [
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 291.7, top: 4525.5, width: 439.8, height: 40.4 },
        },
      ],
    },
    {
      text: 'Compra realizada en\nCAN-LP-Los Llanos de Aridane\nC/ Ram\u00f3n Pol, 7\n38760 Los Llanos de Aridane (La Palma)\nInformaci\u00f3n de la tienda >',
      boundingBox: { left: 35.9, top: 4736.5, width: 691.1, height: 354.7 },
      lines: [
        {
          text: 'Compra realizada en',
          boundingBox: { left: 35.9, top: 4736.5, width: 457.7, height: 53.9 },
        },
        {
          text: 'CAN-LP-Los Llanos de Aridane',
          boundingBox: { left: 35.9, top: 4839.8, width: 534.0, height: 44.9 },
        },
        {
          text: 'C/ Ram\u00f3n Pol, 7',
          boundingBox: { left: 35.9, top: 4898.1, width: 291.7, height: 40.4 },
        },
        {
          text: '38760 Los Llanos de Aridane (La Palma)',
          boundingBox: { left: 35.9, top: 4956.5, width: 691.1, height: 35.9 },
        },
        {
          text: 'Informaci\u00f3n de la tienda >',
          boundingBox: { left: 35.9, top: 5041.8, width: 507.1, height: 49.4 },
        },
      ],
    },
    {
      text: 'EUR\n4,35\n-0.53\n4.10\n-8,50\n2,59\n-0,39\n-0,27\n1,98\n-0.24\n3.49\n-0.43\n2,09\n-0,26\n2,95\n-0,30\n1,29\n-0,16\n1,70\n-0,21\n1,99\n-0.24\n1,65\n-0,20\n1,99\n-0,24\n1,75\n-0,22\n0.99\n-0,12\n1,25\n-9,15\n1,49\n-0,18\n3.99\n-0.49\n1,45\n-0,20\n35,70\nse,e0\n-14,30',
      boundingBox: { left: 834.7, top: 808.1, width: 143.9, height: 2249.3 },
      lines: [
        { text: 'EUR', boundingBox: { left: 897.5, top: 808.1, width: 76.3, height: 35.9 } },
        { text: '4,35', boundingBox: { left: 879.5, top: 857.4, width: 98.9, height: 45.2 } },
        { text: '-0.53', boundingBox: { left: 857.1, top: 906.9, width: 116.7, height: 44.9 } },
        { text: '4.10', boundingBox: { left: 879.5, top: 956.2, width: 98.8, height: 49.6 } },
        { text: '-8,50', boundingBox: { left: 857.1, top: 1010.2, width: 121.2, height: 49.4 } },
        { text: '2,59', boundingBox: { left: 879.4, top: 1063.7, width: 94.6, height: 45.7 } },
        { text: '-0,39', boundingBox: { left: 857.1, top: 1113.4, width: 116.7, height: 44.9 } },
        { text: '-0,27', boundingBox: { left: 857.1, top: 1162.8, width: 116.7, height: 49.4 } },
        { text: '1,98', boundingBox: { left: 879.6, top: 1216.7, width: 94.2, height: 44.9 } },
        { text: '-0.24', boundingBox: { left: 857.1, top: 1270.6, width: 116.7, height: 40.4 } },
        { text: '3.49', boundingBox: { left: 879.5, top: 1315.4, width: 94.2, height: 49.4 } },
        { text: '-0.43', boundingBox: { left: 857.1, top: 1369.3, width: 116.7, height: 40.4 } },
        { text: '2,09', boundingBox: { left: 879.6, top: 1418.7, width: 98.7, height: 49.4 } },
        { text: '-0,26', boundingBox: { left: 857.1, top: 1472.6, width: 116.7, height: 44.9 } },
        { text: '2,95', boundingBox: { left: 879.4, top: 1521.6, width: 99.1, height: 50.2 } },
        { text: '-0,30', boundingBox: { left: 857.0, top: 1575.6, width: 116.9, height: 45.4 } },
        { text: '1,29', boundingBox: { left: 879.5, top: 1625.2, width: 94.2, height: 49.4 } },
        { text: '-0,16', boundingBox: { left: 857.0, top: 1678.9, width: 116.8, height: 45.3 } },
        { text: '1,70', boundingBox: { left: 879.6, top: 1728.5, width: 94.2, height: 44.9 } },
        { text: '-0,21', boundingBox: { left: 857.1, top: 1827.3, width: 116.7, height: 49.4 } },
        { text: '1,99', boundingBox: { left: 879.6, top: 1885.6, width: 94.2, height: 44.9 } },
        { text: '-0.24', boundingBox: { left: 856.5, top: 1933.3, width: 118.0, height: 48.4 } },
        { text: '1,65', boundingBox: { left: 879.6, top: 1984.4, width: 94.2, height: 44.9 } },
        { text: '-0,20', boundingBox: { left: 857.1, top: 2033.8, width: 116.7, height: 49.4 } },
        { text: '1,99', boundingBox: { left: 879.5, top: 2087.7, width: 94.2, height: 49.4 } },
        { text: '-0,24', boundingBox: { left: 857.1, top: 2137.0, width: 116.7, height: 44.9 } },
        { text: '1,75', boundingBox: { left: 879.2, top: 2185.8, width: 99.3, height: 50.6 } },
        { text: '-0,22', boundingBox: { left: 857.1, top: 2240.3, width: 116.7, height: 44.9 } },
        { text: '0.99', boundingBox: { left: 879.5, top: 2294.2, width: 94.2, height: 49.4 } },
        { text: '-0,12', boundingBox: { left: 856.9, top: 2347.6, width: 117.0, height: 41.4 } },
        { text: '1,25', boundingBox: { left: 879.5, top: 2397.4, width: 98.7, height: 44.9 } },
        { text: '-9,15', boundingBox: { left: 857.1, top: 2446.8, width: 116.7, height: 44.9 } },
        { text: '1,49', boundingBox: { left: 879.3, top: 2495.7, width: 94.8, height: 50.5 } },
        { text: '-0,18', boundingBox: { left: 857.1, top: 2550.1, width: 116.7, height: 44.9 } },
        { text: '3.99', boundingBox: { left: 879.5, top: 2599.5, width: 94.2, height: 44.9 } },
        { text: '-0.49', boundingBox: { left: 857.1, top: 2648.9, width: 116.7, height: 44.9 } },
        { text: '1,45', boundingBox: { left: 879.5, top: 2702.7, width: 98.7, height: 49.4 } },
        { text: '-0,20', boundingBox: { left: 857.1, top: 2756.6, width: 121.2, height: 44.9 } },
        { text: '35,70', boundingBox: { left: 856.8, top: 2854.6, width: 117.3, height: 51.0 } },
        { text: 'se,e0', boundingBox: { left: 856.3, top: 2903.0, width: 118.3, height: 57.4 } },
        { text: '-14,30', boundingBox: { left: 834.7, top: 3008.0, width: 143.6, height: 49.4 } },
      ],
    },
    {
      text: '24.12.23 13:19',
      boundingBox: { left: 614.8, top: 3519.8, width: 363.5, height: 50.0 },
      lines: [
        {
          text: '24.12.23 13:19',
          boundingBox: { left: 614.8, top: 3519.8, width: 363.5, height: 50.0 },
        },
      ],
    },
  ],
};

const lidlLosLlanosExtra: PhotoFixture = {
  dimensions: { width: 1077, height: 5265 },
  blocks: [
    {
      text: 'Copia\nLADL',
      boundingBox: { left: 453.2, top: 62.9, width: 170.5, height: 221.8 },
      lines: [
        { text: 'Copia', boundingBox: { left: 453.2, top: 62.9, width: 170.5, height: 67.4 } },
        { text: 'LADL', boundingBox: { left: 466.1, top: 227.4, width: 153.7, height: 57.3 } },
      ],
    },
    {
      text: 'LIOL SUPERMERCADOS S.A.U\nC/ Ram\u00f3n Pol n* 7\n38760Los Llanos de Aridane, La Palna\nNIF A60195278\nwww.lsd1-canarias.es\nFloralys/Papel hig1enico\nSolevita/Zuno manzan 2,39x\nFloralys/Mega rollo cocs\nOrlando Pure Taste/Croqu\nAguas palna 81\nMilbona/Natillas vain pr\nDto. Lid1 Plus\nMilbona/Leche sin la 0,91x\nMilbona/Yogur natura 1,55x\nManzana Golden 1kg\nPl\u00e1tano Canar\u00edas\n1,017 kg x 1,95 EUR/kg\nCebolla 1 Kg\nAlesto Selection/Arandan\nAlesto/Datsl\nAlesto Selection/Nue 1,95x\nCroanfield/Copos de aven\nLechuga batavia\nPuerro 500g\nMelocot\u00f3n\n0,656 kg x 2,65\nEUR/kg\nSolevita/Kombucha 1im\u00f3n\nCalabac\u00edn blanco\n0,958 kg x 2,65\nEUR/kg\nNaranja 2 kg\nManga\n0,480 kg x 4,35 [UR/kg\nMilbona/Bebida alta prot\nPiniento rojo kg\nCUR/kg\n0.262 kg x 2,89\nArandano 250 g\nTotal\nEntregado\nCanbio\nIGIC 0%',
      boundingBox: { left: 43.9, top: 602.0, width: 835.7, height: 2242.1 },
      lines: [
        {
          text: 'LIOL SUPERMERCADOS S.A.U',
          boundingBox: { left: 219.9, top: 602.0, width: 534.0, height: 44.9 },
        },
        {
          text: 'C/ Ram\u00f3n Pol n* 7',
          boundingBox: { left: 282.7, top: 651.4, width: 381.4, height: 40.7 },
        },
        {
          text: '38760Los Llanos de Aridane, La Palna',
          boundingBox: { left: 89.8, top: 700.8, width: 789.8, height: 50.0 },
        },
        {
          text: 'NIF A60195278',
          boundingBox: { left: 332.1, top: 754.7, width: 291.7, height: 40.5 },
        },
        {
          text: 'www.lsd1-canarias.es',
          boundingBox: { left: 264.8, top: 804.1, width: 444.3, height: 49.4 },
        },
        {
          text: 'Floralys/Papel hig1enico',
          boundingBox: { left: 44.9, top: 907.4, width: 534.0, height: 44.9 },
        },
        {
          text: 'Solevita/Zuno manzan 2,39x',
          boundingBox: { left: 44.9, top: 956.9, width: 641.7, height: 49.9 },
        },
        {
          text: 'Floralys/Mega rollo cocs',
          boundingBox: { left: 44.9, top: 1010.7, width: 534.0, height: 45.0 },
        },
        {
          text: 'Orlando Pure Taste/Croqu',
          boundingBox: { left: 44.9, top: 1060.2, width: 534.0, height: 44.9 },
        },
        {
          text: 'Aguas palna 81',
          boundingBox: { left: 44.9, top: 1109.6, width: 314.1, height: 50.0 },
        },
        {
          text: 'Milbona/Natillas vain pr',
          boundingBox: { left: 44.9, top: 1163.5, width: 534.0, height: 45.0 },
        },
        {
          text: 'Dto. Lid1 Plus',
          boundingBox: { left: 157.1, top: 1212.9, width: 309.6, height: 44.9 },
        },
        {
          text: 'Milbona/Leche sin la 0,91x',
          boundingBox: { left: 44.9, top: 1266.6, width: 596.8, height: 45.7 },
        },
        {
          text: 'Milbona/Yogur natura 1,55x',
          boundingBox: { left: 44.9, top: 1316.3, width: 601.3, height: 49.6 },
        },
        {
          text: 'Manzana Golden 1kg',
          boundingBox: { left: 44.9, top: 1369.8, width: 403.9, height: 45.7 },
        },
        {
          text: 'Pl\u00e1tano Canar\u00edas',
          boundingBox: { left: 44.9, top: 1419.4, width: 359.0, height: 40.6 },
        },
        {
          text: '1,017 kg x 1,95 EUR/kg',
          boundingBox: { left: 85.3, top: 1469.0, width: 538.5, height: 49.7 },
        },
        {
          text: 'Cebolla 1 Kg',
          boundingBox: { left: 44.9, top: 1522.6, width: 269.2, height: 45.7 },
        },
        {
          text: 'Alesto Selection/Arandan',
          boundingBox: { left: 44.9, top: 1572.2, width: 534.0, height: 40.6 },
        },
        {
          text: 'Alesto/Datsl',
          boundingBox: { left: 44.9, top: 1621.7, width: 269.2, height: 44.9 },
        },
        {
          text: 'Alesto Selection/Nue 1,95x',
          boundingBox: { left: 44.9, top: 1675.3, width: 659.7, height: 49.7 },
        },
        {
          text: 'Croanfield/Copos de aven',
          boundingBox: { left: 44.9, top: 1725.0, width: 534.0, height: 45.0 },
        },
        {
          text: 'Lechuga batavia',
          boundingBox: { left: 44.9, top: 1778.5, width: 336.6, height: 45.7 },
        },
        {
          text: 'Puerro 500g',
          boundingBox: { left: 44.8, top: 1827.9, width: 251.5, height: 50.3 },
        },
        {
          text: 'Melocot\u00f3n',
          boundingBox: { left: 44.9, top: 1882.3, width: 206.4, height: 35.9 },
        },
        {
          text: '0,656 kg x 2,65',
          boundingBox: { left: 89.7, top: 1931.3, width: 336.6, height: 45.7 },
        },
        { text: 'EUR/kg', boundingBox: { left: 480.2, top: 1931.7, width: 143.6, height: 44.9 } },
        {
          text: 'Solevita/Kombucha 1im\u00f3n',
          boundingBox: { left: 44.9, top: 1976.6, width: 511.6, height: 44.9 },
        },
        {
          text: 'Calabac\u00edn blanco',
          boundingBox: { left: 44.9, top: 2030.5, width: 359.0, height: 40.5 },
        },
        {
          text: '0,958 kg x 2,65',
          boundingBox: { left: 89.8, top: 2084.1, width: 377.0, height: 49.8 },
        },
        { text: 'EUR/kg', boundingBox: { left: 480.2, top: 2084.4, width: 143.6, height: 44.9 } },
        {
          text: 'Naranja 2 kg',
          boundingBox: { left: 44.9, top: 2138.3, width: 273.7, height: 45.0 },
        },
        { text: 'Manga', boundingBox: { left: 44.3, top: 2186.1, width: 122.3, height: 48.2 } },
        {
          text: '0,480 kg x 4,35 [UR/kg',
          boundingBox: { left: 89.8, top: 2236.8, width: 534.0, height: 45.7 },
        },
        {
          text: 'Milbona/Bebida alta prot',
          boundingBox: { left: 44.9, top: 2291.1, width: 534.0, height: 45.0 },
        },
        {
          text: 'Piniento rojo kg',
          boundingBox: { left: 44.9, top: 2340.0, width: 359.0, height: 45.7 },
        },
        { text: 'CUR/kg', boundingBox: { left: 479.9, top: 2389.1, width: 144.1, height: 46.5 } },
        {
          text: '0.262 kg x 2,89',
          boundingBox: { left: 89.8, top: 2389.6, width: 332.1, height: 49.7 },
        },
        {
          text: 'Arandano 250 g',
          boundingBox: { left: 43.9, top: 2432.4, width: 320.8, height: 57.4 },
        },
        { text: 'Total', boundingBox: { left: 44.9, top: 2547.1, width: 116.7, height: 40.4 } },
        { text: 'Entregado', boundingBox: { left: 44.7, top: 2595.8, width: 206.7, height: 46.4 } },
        { text: 'Canbio', boundingBox: { left: 44.9, top: 2699.9, width: 143.6, height: 40.4 } },
        { text: 'IGIC 0%', boundingBox: { left: 462.2, top: 2798.3, width: 161.5, height: 45.7 } },
      ],
    },
    {
      text: 'Gracias a Lidi Plus has ahorrado\n0.28 [UR en esta compra\n250135/02\n9982\nDevoluciones art\u00edculos de bazar con\nticket de compra y embalaje or\u00edginal\nen un plazo m\u00e1xiso de 30 d\u00edas sin\nperjuicio de la ley de garant\u00edas.\nAtenci\u00f3n al Cliente - Tel.908958311\nww.l1d1-canarias.es/contacto\nCOMERCIO MINORISTA\nGRACIAS POR SU VISITA',
      boundingBox: { left: 44.9, top: 3005.4, width: 839.2, height: 656.1 },
      lines: [
        {
          text: 'Gracias a Lidi Plus has ahorrado',
          boundingBox: { left: 130.1, top: 3005.4, width: 709.0, height: 41.1 },
        },
        {
          text: '0.28 [UR en esta compra',
          boundingBox: { left: 219.9, top: 3054.3, width: 511.6, height: 45.7 },
        },
        {
          text: '250135/02',
          boundingBox: { left: 197.2, top: 3210.5, width: 202.5, height: 43.4 },
        },
        { text: '9982', boundingBox: { left: 44.9, top: 3212.0, width: 112.2, height: 40.4 } },
        {
          text: 'Devoluciones art\u00edculos de bazar con',
          boundingBox: { left: 89.8, top: 3261.4, width: 771.9, height: 41.0 },
        },
        {
          text: 'ticket de compra y embalaje or\u00edginal',
          boundingBox: { left: 89.8, top: 3310.2, width: 794.3, height: 50.0 },
        },
        {
          text: 'en un plazo m\u00e1xiso de 30 d\u00edas sin',
          boundingBox: { left: 112.2, top: 3364.7, width: 731.5, height: 40.8 },
        },
        {
          text: 'perjuicio de la ley de garant\u00edas.',
          boundingBox: { left: 112.2, top: 3414.2, width: 727.0, height: 44.9 },
        },
        {
          text: 'Atenci\u00f3n al Cliente - Tel.908958311',
          boundingBox: { left: 89.8, top: 3463.0, width: 771.9, height: 45.7 },
        },
        {
          text: 'ww.l1d1-canarias.es/contacto',
          boundingBox: { left: 179.5, top: 3517.5, width: 614.8, height: 44.9 },
        },
        {
          text: 'COMERCIO MINORISTA',
          boundingBox: { left: 287.2, top: 3571.4, width: 399.4, height: 40.5 },
        },
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 242.3, top: 3620.8, width: 466.7, height: 40.7 },
        },
      ],
    },
    {
      text: 'GRACIAS POR SU VISITA',
      boundingBox: { left: 287.2, top: 4200.3, width: 444.3, height: 40.9 },
      lines: [
        {
          text: 'GRACIAS POR SU VISITA',
          boundingBox: { left: 287.2, top: 4200.3, width: 444.3, height: 40.9 },
        },
      ],
    },
    {
      text: 'Cupones canjeados\n\u2022 \u202215%\nNatilas valinilta peoteinas',
      boundingBox: { left: 35.9, top: 4379.7, width: 511.6, height: 270.3 },
      lines: [
        {
          text: 'Cupones canjeados',
          boundingBox: { left: 35.9, top: 4379.7, width: 435.3, height: 49.8 },
        },
        {
          text: '\u2022 \u202215%',
          boundingBox: { left: 76.3, top: 4537.2, width: 179.5, height: 63.1 },
        },
        {
          text: 'Natilas valinilta peoteinas',
          boundingBox: { left: 166.0, top: 4618.1, width: 381.4, height: 31.9 },
        },
      ],
    },
    {
      text: 'Compra realizada en\nCAN-LP-Los Llanos de Aridane\nC/ Ram\u00f3n Pol,7\n38760 Los Llanos de Aridane (La Palma)\nInformaci\u00f3n de la tienda )',
      boundingBox: { left: 35.2, top: 4833.7, width: 691.8, height: 350.9 },
      lines: [
        {
          text: 'Compra realizada en',
          boundingBox: { left: 35.9, top: 4833.7, width: 453.2, height: 53.9 },
        },
        {
          text: 'CAN-LP-Los Llanos de Aridane',
          boundingBox: { left: 35.9, top: 4932.0, width: 529.5, height: 41.0 },
        },
        {
          text: 'C/ Ram\u00f3n Pol,7',
          boundingBox: { left: 35.9, top: 4986.5, width: 291.7, height: 50.0 },
        },
        {
          text: '38760 Los Llanos de Aridane (La Palma)',
          boundingBox: { left: 35.9, top: 5044.3, width: 691.1, height: 45.7 },
        },
        {
          text: 'Informaci\u00f3n de la tienda )',
          boundingBox: { left: 35.2, top: 5120.8, width: 504.2, height: 63.8 },
        },
      ],
    },
    {
      text: 'EUR\n4,35\n4,78\n2.99\n8.99\n1,41\n1,89\n-8.28\n6\n5,46\n3,10\n2\n1,85\n1,98\n1,85\n2.25\n1,19\n3,90\n2\n0,85\n1,59\n2.45\n1,74\n1,79\n2,54\n3,15\n2,09\n1,19\n0,76\n3.19\n67.05\n100,00\n-32.95',
      boundingBox: { left: 700.1, top: 858.0, width: 274.3, height: 1891.4 },
      lines: [
        { text: 'EUR', boundingBox: { left: 897.5, top: 858.0, width: 76.3, height: 35.9 } },
        { text: '4,35', boundingBox: { left: 875.1, top: 907.4, width: 98.7, height: 44.9 } },
        { text: '4,78', boundingBox: { left: 874.8, top: 960.7, width: 99.3, height: 46.2 } },
        { text: '2.99', boundingBox: { left: 875.1, top: 1010.8, width: 98.7, height: 49.4 } },
        { text: '8.99', boundingBox: { left: 875.1, top: 1060.2, width: 98.7, height: 44.9 } },
        { text: '1,41', boundingBox: { left: 875.1, top: 1114.1, width: 94.2, height: 44.9 } },
        { text: '1,89', boundingBox: { left: 874.8, top: 1162.9, width: 99.2, height: 46.1 } },
        { text: '-8.28', boundingBox: { left: 852.3, top: 1212.0, width: 117.4, height: 46.8 } },
        { text: '6', boundingBox: { left: 704.5, top: 1266.8, width: 26.9, height: 31.4 } },
        { text: '5,46', boundingBox: { left: 875.1, top: 1266.8, width: 94.2, height: 44.9 } },
        { text: '3,10', boundingBox: { left: 874.5, top: 1315.2, width: 99.8, height: 51.5 } },
        { text: '2', boundingBox: { left: 700.1, top: 1316.2, width: 31.4, height: 40.4 } },
        { text: '1,85', boundingBox: { left: 875.1, top: 1370.2, width: 98.7, height: 44.9 } },
        { text: '1,98', boundingBox: { left: 875.1, top: 1419.6, width: 98.7, height: 49.4 } },
        { text: '1,85', boundingBox: { left: 875.1, top: 1522.9, width: 98.7, height: 44.9 } },
        { text: '2.25', boundingBox: { left: 875.1, top: 1572.3, width: 98.7, height: 44.9 } },
        { text: '1,19', boundingBox: { left: 875.1, top: 1626.2, width: 98.7, height: 44.9 } },
        { text: '3,90', boundingBox: { left: 875.0, top: 1675.5, width: 94.4, height: 49.8 } },
        { text: '2', boundingBox: { left: 704.5, top: 1675.6, width: 26.9, height: 35.9 } },
        { text: '0,85', boundingBox: { left: 875.1, top: 1725.1, width: 98.7, height: 44.9 } },
        { text: '1,59', boundingBox: { left: 875.1, top: 1774.5, width: 98.7, height: 49.4 } },
        { text: '2.45', boundingBox: { left: 875.1, top: 1828.4, width: 98.7, height: 49.4 } },
        { text: '1,74', boundingBox: { left: 874.7, top: 1881.6, width: 94.9, height: 46.3 } },
        { text: '1,79', boundingBox: { left: 875.1, top: 1981.1, width: 94.2, height: 49.4 } },
        { text: '2,54', boundingBox: { left: 875.1, top: 2030.5, width: 94.2, height: 53.9 } },
        { text: '3,15', boundingBox: { left: 875.1, top: 2138.3, width: 98.7, height: 44.9 } },
        { text: '2,09', boundingBox: { left: 875.1, top: 2187.8, width: 98.7, height: 44.9 } },
        { text: '1,19', boundingBox: { left: 875.1, top: 2291.1, width: 98.7, height: 44.9 } },
        { text: '0,76', boundingBox: { left: 874.8, top: 2339.9, width: 99.3, height: 50.5 } },
        { text: '3.19', boundingBox: { left: 875.1, top: 2439.3, width: 98.7, height: 49.4 } },
        { text: '67.05', boundingBox: { left: 852.6, top: 2547.0, width: 121.3, height: 45.2 } },
        { text: '100,00', boundingBox: { left: 830.2, top: 2596.6, width: 143.6, height: 44.9 } },
        { text: '-32.95', boundingBox: { left: 830.1, top: 2699.7, width: 143.7, height: 49.7 } },
      ],
    },
    {
      text: '20.08.24 10:25',
      boundingBox: { left: 610.3, top: 3212.0, width: 363.5, height: 44.9 },
      lines: [
        {
          text: '20.08.24 10:25',
          boundingBox: { left: 610.3, top: 3212.0, width: 363.5, height: 44.9 },
        },
      ],
    },
  ],
};

export const LIDL_PHOTO_FIXTURES = {
  lidlLosLlanos20240520,
  lidlLosLlanos20231226,
  lidlLosLlanos20231224,
  lidlLosLlanosExtra,
};
