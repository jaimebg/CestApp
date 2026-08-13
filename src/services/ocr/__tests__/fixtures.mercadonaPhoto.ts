import type { OcrBlock } from '../index';

/**
 * Real geometry of a Mercadona (Canarias) receipt, captured as a photo.
 * Product names, unit prices and line totals sit in three separate columns,
 * so OCR emits them as separate lines/blocks sharing the same Y.
 */
export const MERCADONA_PHOTO_BLOCKS: OcrBlock[] = [
  {
    text: 'MERCADONA, S.A. A-46103834\nCL JULIANO BONNY GÓMEZ, 4\n35250 INGENIO\nTELÉFONO: 928628756\n11/08/2026 09:27\nOP: 4307667\nFACTURA SIMPLIFICADA: 4451-015-683355',
    lines: [
      {
        text: 'MERCADONA, S.A. A-46103834',
        boundingBox: {
          left: 155,
          top: 134,
          width: 302,
          height: 20,
        },
      },
      {
        text: 'CL JULIANO BONNY GÓMEZ, 4',
        boundingBox: {
          left: 160,
          top: 159,
          width: 293,
          height: 20,
        },
      },
      {
        text: '35250 INGENIO',
        boundingBox: {
          left: 235,
          top: 183,
          width: 141,
          height: 20,
        },
      },
      {
        text: 'TELÉFONO: 928628756',
        boundingBox: {
          left: 194,
          top: 207,
          width: 223,
          height: 20,
        },
      },
      {
        text: '11/08/2026 09:27',
        boundingBox: {
          left: 157,
          top: 231,
          width: 145,
          height: 20,
        },
      },
      {
        text: 'OP: 4307667',
        boundingBox: {
          left: 347,
          top: 231,
          width: 108,
          height: 20,
        },
      },
      {
        text: 'FACTURA SIMPLIFICADA: 4451-015-683355',
        boundingBox: {
          left: 106,
          top: 255,
          width: 400,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 106,
      top: 134,
      width: 400,
      height: 141,
    },
  },
  {
    text: 'Descripción\n1 BEBIDA AVENA\n2 ZUMO NARANJA C/PULPA\n1 TORTITA LEGUMBRE 44%\n1 ESCALOPIN SALMÓN\n2 PECHUGA PAVO 92%\n1 100% INTEGRAL FINO\n3 QUESO COTTAGE\n1 CREMA COTTAGE\n1 PLATANO\n0,914 kg',
    lines: [
      {
        text: 'Descripción',
        boundingBox: {
          left: 83,
          top: 363,
          width: 99,
          height: 20,
        },
      },
      {
        text: '1 BEBIDA AVENA',
        boundingBox: {
          left: 62,
          top: 389,
          width: 173,
          height: 20,
        },
      },
      {
        text: '2 ZUMO NARANJA C/PULPA',
        boundingBox: {
          left: 62,
          top: 415,
          width: 270,
          height: 20,
        },
      },
      {
        text: '1 TORTITA LEGUMBRE 44%',
        boundingBox: {
          left: 62,
          top: 440,
          width: 267,
          height: 20,
        },
      },
      {
        text: '1 ESCALOPIN SALMÓN',
        boundingBox: {
          left: 62,
          top: 466,
          width: 224,
          height: 20,
        },
      },
      {
        text: '2 PECHUGA PAVO 92%',
        boundingBox: {
          left: 62,
          top: 491,
          width: 220,
          height: 20,
        },
      },
      {
        text: '1 100% INTEGRAL FINO',
        boundingBox: {
          left: 62,
          top: 517,
          width: 228,
          height: 20,
        },
      },
      {
        text: '3 QUESO COTTAGE',
        boundingBox: {
          left: 62,
          top: 542,
          width: 189,
          height: 20,
        },
      },
      {
        text: '1 CREMA COTTAGE',
        boundingBox: {
          left: 62,
          top: 568,
          width: 193,
          height: 20,
        },
      },
      {
        text: '1 PLATANO',
        boundingBox: {
          left: 62,
          top: 593,
          width: 116,
          height: 20,
        },
      },
      {
        text: '0,914 kg',
        boundingBox: {
          left: 123,
          top: 615,
          width: 71,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 62,
      top: 363,
      width: 270,
      height: 272,
    },
  },
  {
    text: 'P. Unit',
    lines: [
      {
        text: 'P. Unit',
        boundingBox: {
          left: 404,
          top: 363,
          width: 58,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 404,
      top: 363,
      width: 58,
      height: 20,
    },
  },
  {
    text: '1,75',
    lines: [
      {
        text: '1,75',
        boundingBox: {
          left: 426,
          top: 415,
          width: 36,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 426,
      top: 415,
      width: 36,
      height: 20,
    },
  },
  {
    text: '2,85',
    lines: [
      {
        text: '2,85',
        boundingBox: {
          left: 426,
          top: 491,
          width: 36,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 426,
      top: 491,
      width: 36,
      height: 20,
    },
  },
  {
    text: '1,35',
    lines: [
      {
        text: '1,35',
        boundingBox: {
          left: 426,
          top: 542,
          width: 36,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 426,
      top: 542,
      width: 36,
      height: 20,
    },
  },
  {
    text: 'Importe\n1,00\n3,50\n1,75\n7,80\n5,70\n1,50\n4,05\n1,50',
    lines: [
      {
        text: 'Importe',
        boundingBox: {
          left: 510,
          top: 363,
          width: 65,
          height: 20,
        },
      },
      {
        text: '1,00',
        boundingBox: {
          left: 539,
          top: 389,
          width: 36,
          height: 20,
        },
      },
      {
        text: '3,50',
        boundingBox: {
          left: 539,
          top: 415,
          width: 36,
          height: 20,
        },
      },
      {
        text: '1,75',
        boundingBox: {
          left: 539,
          top: 440,
          width: 36,
          height: 20,
        },
      },
      {
        text: '7,80',
        boundingBox: {
          left: 539,
          top: 466,
          width: 36,
          height: 20,
        },
      },
      {
        text: '5,70',
        boundingBox: {
          left: 539,
          top: 491,
          width: 36,
          height: 20,
        },
      },
      {
        text: '1,50',
        boundingBox: {
          left: 539,
          top: 517,
          width: 36,
          height: 20,
        },
      },
      {
        text: '4,05',
        boundingBox: {
          left: 539,
          top: 542,
          width: 36,
          height: 20,
        },
      },
      {
        text: '1,50',
        boundingBox: {
          left: 539,
          top: 568,
          width: 36,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 510,
      top: 363,
      width: 65,
      height: 225,
    },
  },
  {
    text: '1,95 €/kg',
    lines: [
      {
        text: '1,95 €/kg',
        boundingBox: {
          left: 384,
          top: 615,
          width: 77,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 384,
      top: 615,
      width: 77,
      height: 20,
    },
  },
  {
    text: 'TOTAL (€)\nTARJETA BANCARIA',
    lines: [
      {
        text: 'TOTAL (€)',
        boundingBox: {
          left: 391,
          top: 649,
          width: 100,
          height: 20,
        },
      },
      {
        text: 'TARJETA BANCARIA',
        boundingBox: {
          left: 281,
          top: 671,
          width: 210,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 281,
      top: 649,
      width: 210,
      height: 42,
    },
  },
  {
    text: '1,78',
    lines: [
      {
        text: '1,78',
        boundingBox: {
          left: 539,
          top: 615,
          width: 36,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 539,
      top: 615,
      width: 36,
      height: 20,
    },
  },
  {
    text: '28,58\n28,58',
    lines: [
      {
        text: '28,58',
        boundingBox: {
          left: 529,
          top: 649,
          width: 46,
          height: 20,
        },
      },
      {
        text: '28,58',
        boundingBox: {
          left: 529,
          top: 671,
          width: 46,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 529,
      top: 649,
      width: 46,
      height: 42,
    },
  },
  {
    text: 'COMERCIANTE MINORISTA',
    lines: [
      {
        text: 'COMERCIANTE MINORISTA',
        boundingBox: {
          left: 173,
          top: 724,
          width: 266,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 173,
      top: 724,
      width: 266,
      height: 20,
    },
  },
  {
    text: 'TARJ. BANCARIA: **** **** **** 5149\nAUT: SODXVN ARC: 00 AID: A0000000031010\nVerificado por dispositivo\nImporte: 28,58 €',
    lines: [
      {
        text: 'TARJ. BANCARIA: **** **** **** 5149',
        boundingBox: {
          left: 41,
          top: 770,
          width: 360,
          height: 20,
        },
      },
      {
        text: 'AUT: SODXVN ARC: 00 AID: A0000000031010',
        boundingBox: {
          left: 41,
          top: 794,
          width: 415,
          height: 20,
        },
      },
      {
        text: 'Verificado por dispositivo',
        boundingBox: {
          left: 41,
          top: 818,
          width: 214,
          height: 20,
        },
      },
      {
        text: 'Importe: 28,58 €',
        boundingBox: {
          left: 41,
          top: 842,
          width: 137,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 41,
      top: 770,
      width: 415,
      height: 92,
    },
  },
  {
    text: 'SE ADMITEN DEVOLUCIONES CON TICKET',
    lines: [
      {
        text: 'SE ADMITEN DEVOLUCIONES CON TICKET',
        boundingBox: {
          left: 100,
          top: 1012,
          width: 411,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 100,
      top: 1012,
      width: 411,
      height: 20,
    },
  },
  {
    text: 'VISA',
    lines: [
      {
        text: 'VISA',
        boundingBox: {
          left: 525,
          top: 842,
          width: 48,
          height: 20,
        },
      },
    ],
    boundingBox: {
      left: 525,
      top: 842,
      width: 48,
      height: 20,
    },
  },
];
