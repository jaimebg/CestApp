import { db } from './client';
import { receipts, items, stores, categories } from './schema';
import { createScopedLogger } from '../utils/debug';

const logger = createScopedLogger('DemoData');

interface DemoReceiptData {
  storeName: string;
  storeNormalized: string;
  daysAgo: number;
  paymentMethod: 'card' | 'cash';
  items: {
    name: string;
    price: number;
    quantity?: number;
    unit?: string;
    categoryName: string;
  }[];
}

const DEMO_RECEIPTS: DemoReceiptData[] = [
  // This month - recent purchases
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 1,
    paymentMethod: 'card',
    items: [
      { name: 'LECHE HACENDADO', price: 119, categoryName: 'Dairy' },
      { name: 'PAN BARRA', price: 65, categoryName: 'Bakery' },
      { name: 'HUEVOS CAMPEROS', price: 289, quantity: 12, categoryName: 'Dairy' },
      { name: 'TOMATE RALLADO', price: 145, categoryName: 'Produce' },
      { name: 'POLLO ENTERO', price: 589, quantity: 1, unit: 'kg', categoryName: 'Meat' },
      { name: 'ACEITE OLIVA VIRGEN', price: 899, categoryName: 'Pantry' },
      { name: 'AGUA MINERAL', price: 42, quantity: 6, categoryName: 'Beverages' },
      { name: 'YOGUR NATURAL', price: 189, quantity: 8, categoryName: 'Dairy' },
      { name: 'ARROZ REDONDO', price: 159, categoryName: 'Pantry' },
      { name: 'JAMON SERRANO', price: 459, categoryName: 'Meat' },
    ],
  },
  {
    storeName: 'Lidl',
    storeNormalized: 'lidl',
    daysAgo: 4,
    paymentMethod: 'card',
    items: [
      { name: 'PLATANOS', price: 149, quantity: 1, unit: 'kg', categoryName: 'Produce' },
      { name: 'MANZANAS GOLDEN', price: 219, quantity: 1, unit: 'kg', categoryName: 'Produce' },
      { name: 'QUESO EMMENTAL', price: 349, categoryName: 'Dairy' },
      { name: 'CERVEZA PERLENBACHER', price: 299, quantity: 6, categoryName: 'Beverages' },
      { name: 'CHOCOLATE MILKA', price: 189, categoryName: 'Snacks' },
      { name: 'DETERGENTE FORMIL', price: 599, categoryName: 'Household' },
      { name: 'PAN MOLDE', price: 89, categoryName: 'Bakery' },
    ],
  },
  {
    storeName: 'Carrefour',
    storeNormalized: 'carrefour',
    daysAgo: 8,
    paymentMethod: 'cash',
    items: [
      { name: 'SALMON FRESCO', price: 1299, quantity: 500, unit: 'g', categoryName: 'Meat' },
      { name: 'LANGOSTINOS', price: 899, categoryName: 'Meat' },
      { name: 'VINO TINTO RIOJA', price: 689, categoryName: 'Beverages' },
      { name: 'QUESO MANCHEGO', price: 529, categoryName: 'Dairy' },
      { name: 'ACEITUNAS RELLENAS', price: 229, categoryName: 'Pantry' },
      { name: 'PATATAS FRITAS', price: 189, categoryName: 'Snacks' },
      { name: 'HELADO HAAGEN DAZS', price: 579, categoryName: 'Frozen' },
      { name: 'CHAMPU PANTENE', price: 449, categoryName: 'Personal Care' },
    ],
  },
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 12,
    paymentMethod: 'card',
    items: [
      { name: 'TERNERA PICADA', price: 449, quantity: 500, unit: 'g', categoryName: 'Meat' },
      { name: 'CEBOLLA', price: 109, quantity: 1, unit: 'kg', categoryName: 'Produce' },
      { name: 'PIMIENTO ROJO', price: 189, categoryName: 'Produce' },
      { name: 'AJO MORADO', price: 99, categoryName: 'Produce' },
      { name: 'TOMATE FRITO', price: 115, categoryName: 'Pantry' },
      { name: 'PASTA ESPAGUETI', price: 89, categoryName: 'Pantry' },
      { name: 'QUESO RALLADO', price: 219, categoryName: 'Dairy' },
    ],
  },
  {
    storeName: 'Dia',
    storeNormalized: 'dia',
    daysAgo: 18,
    paymentMethod: 'card',
    items: [
      { name: 'LECHE DESNATADA', price: 99, categoryName: 'Dairy' },
      { name: 'CEREALES CORN FLAKES', price: 249, categoryName: 'Pantry' },
      { name: 'GALLETAS MARIA', price: 129, categoryName: 'Snacks' },
      { name: 'CAFE MOLIDO', price: 379, categoryName: 'Beverages' },
      { name: 'AZUCAR BLANCA', price: 119, categoryName: 'Pantry' },
      { name: 'PAPEL HIGIENICO', price: 399, quantity: 12, categoryName: 'Household' },
    ],
  },

  // Last month
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 35,
    paymentMethod: 'card',
    items: [
      { name: 'PIZZA CONGELADA', price: 329, categoryName: 'Frozen' },
      { name: 'CROQUETAS JAMON', price: 289, categoryName: 'Frozen' },
      { name: 'GUISANTES CONG', price: 179, categoryName: 'Frozen' },
      { name: 'PESCADO EMPANADO', price: 399, categoryName: 'Frozen' },
      { name: 'HELADO VAINILLA', price: 289, categoryName: 'Frozen' },
      { name: 'ZUMO NARANJA', price: 199, categoryName: 'Beverages' },
    ],
  },
  {
    storeName: 'Consum',
    storeNormalized: 'consum',
    daysAgo: 40,
    paymentMethod: 'cash',
    items: [
      { name: 'NARANJA VALENCIA', price: 179, quantity: 2, unit: 'kg', categoryName: 'Produce' },
      { name: 'LIMON', price: 149, quantity: 1, unit: 'kg', categoryName: 'Produce' },
      { name: 'CALABACIN', price: 199, categoryName: 'Produce' },
      { name: 'BERENJENA', price: 229, categoryName: 'Produce' },
      { name: 'ATUN EN ACEITE', price: 289, quantity: 3, categoryName: 'Pantry' },
      { name: 'MAYONESA', price: 189, categoryName: 'Pantry' },
      { name: 'REFRESCO COLA', price: 149, quantity: 2, categoryName: 'Beverages' },
    ],
  },
  {
    storeName: 'Eroski',
    storeNormalized: 'eroski',
    daysAgo: 48,
    paymentMethod: 'card',
    items: [
      { name: 'CHORIZO IBERICO', price: 489, categoryName: 'Meat' },
      { name: 'MORCILLA', price: 329, categoryName: 'Meat' },
      { name: 'SALCHICHON', price: 389, categoryName: 'Meat' },
      { name: 'FUET', price: 299, categoryName: 'Meat' },
      { name: 'QUESO IDIAZABAL', price: 699, categoryName: 'Dairy' },
      { name: 'TXAKOLI', price: 849, categoryName: 'Beverages' },
    ],
  },
  {
    storeName: 'Lidl',
    storeNormalized: 'lidl',
    daysAgo: 55,
    paymentMethod: 'cash',
    items: [
      { name: 'CROISSANTS', price: 179, quantity: 6, categoryName: 'Bakery' },
      { name: 'NAPOLITANAS CHOC', price: 199, quantity: 4, categoryName: 'Bakery' },
      { name: 'DONUTS', price: 149, quantity: 4, categoryName: 'Bakery' },
      { name: 'MAGDALENAS', price: 139, quantity: 12, categoryName: 'Bakery' },
      { name: 'MANTEQUILLA', price: 269, categoryName: 'Dairy' },
      { name: 'MERMELADA FRESA', price: 179, categoryName: 'Pantry' },
    ],
  },

  // 2 months ago
  {
    storeName: 'Alcampo',
    storeNormalized: 'alcampo',
    daysAgo: 65,
    paymentMethod: 'card',
    items: [
      { name: 'DETERGENTE ARIEL', price: 899, categoryName: 'Household' },
      { name: 'SUAVIZANTE', price: 399, categoryName: 'Household' },
      { name: 'LAVAVAJILLAS', price: 299, categoryName: 'Household' },
      { name: 'LIMPIADOR MULTIUSOS', price: 249, categoryName: 'Household' },
      { name: 'BOLSAS BASURA', price: 189, categoryName: 'Household' },
      { name: 'PAPEL COCINA', price: 279, quantity: 3, categoryName: 'Household' },
      { name: 'AMBIENTADOR', price: 349, categoryName: 'Household' },
    ],
  },
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 72,
    paymentMethod: 'card',
    items: [
      { name: 'GEL DUCHA DELIPLUS', price: 189, categoryName: 'Personal Care' },
      { name: 'CHAMPU DELIPLUS', price: 229, categoryName: 'Personal Care' },
      { name: 'CREMA HIDRATANTE', price: 299, categoryName: 'Personal Care' },
      { name: 'DESODORANTE', price: 249, categoryName: 'Personal Care' },
      { name: 'PASTA DIENTES', price: 149, categoryName: 'Personal Care' },
      { name: 'CEPILLO DIENTES', price: 199, quantity: 2, categoryName: 'Personal Care' },
    ],
  },
  {
    storeName: 'Carrefour',
    storeNormalized: 'carrefour',
    daysAgo: 80,
    paymentMethod: 'card',
    items: [
      { name: 'FRUTOS SECOS MIX', price: 449, categoryName: 'Snacks' },
      { name: 'ALMENDRAS', price: 389, categoryName: 'Snacks' },
      { name: 'PISTACHOS', price: 599, categoryName: 'Snacks' },
      { name: 'NUECES', price: 479, categoryName: 'Snacks' },
      { name: 'AVELLANAS', price: 419, categoryName: 'Snacks' },
      { name: 'PASAS', price: 229, categoryName: 'Snacks' },
      { name: 'DÁTILES', price: 349, categoryName: 'Snacks' },
    ],
  },

  // 3 months ago
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 95,
    paymentMethod: 'card',
    items: [
      { name: 'FILETE TERNERA', price: 1289, categoryName: 'Meat' },
      { name: 'PATATAS', price: 159, quantity: 3, unit: 'kg', categoryName: 'Produce' },
      { name: 'PIMIENTOS PADRON', price: 349, categoryName: 'Produce' },
      { name: 'ENSALADA BOLSA', price: 129, categoryName: 'Produce' },
      { name: 'VINO BLANCO', price: 449, categoryName: 'Beverages' },
      { name: 'GARBANZOS COCIDOS', price: 99, categoryName: 'Pantry' },
    ],
  },
  {
    storeName: 'Lidl',
    storeNormalized: 'lidl',
    daysAgo: 102,
    paymentMethod: 'cash',
    items: [
      { name: 'POLLO ASADO', price: 599, categoryName: 'Meat' },
      { name: 'ENSALADILLA RUSA', price: 249, categoryName: 'Frozen' },
      { name: 'GAZPACHO', price: 189, categoryName: 'Beverages' },
      { name: 'ACEITUNAS NEGRAS', price: 139, categoryName: 'Pantry' },
      { name: 'QUESO BRIE', price: 299, categoryName: 'Dairy' },
    ],
  },
  {
    storeName: 'Dia',
    storeNormalized: 'dia',
    daysAgo: 110,
    paymentMethod: 'card',
    items: [
      { name: 'LENTEJAS', price: 149, categoryName: 'Pantry' },
      { name: 'TOMATE NATURAL', price: 89, categoryName: 'Pantry' },
      { name: 'ALUBIAS BLANCAS', price: 169, categoryName: 'Pantry' },
      { name: 'CALDO POLLO', price: 129, categoryName: 'Pantry' },
      { name: 'SAL GRUESA', price: 59, categoryName: 'Pantry' },
      { name: 'PIMIENTA NEGRA', price: 199, categoryName: 'Pantry' },
    ],
  },

  // 4 months ago
  {
    storeName: 'Carrefour',
    storeNormalized: 'carrefour',
    daysAgo: 125,
    paymentMethod: 'card',
    items: [
      { name: 'CORDERO LECHAL', price: 1899, categoryName: 'Meat' },
      { name: 'ESPÁRRAGOS FRESCOS', price: 399, categoryName: 'Produce' },
      { name: 'CHAMPIÑONES', price: 249, categoryName: 'Produce' },
      { name: 'NATA COCINA', price: 149, categoryName: 'Dairy' },
      { name: 'VINO RESERVA', price: 1299, categoryName: 'Beverages' },
    ],
  },
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 133,
    paymentMethod: 'card',
    items: [
      { name: 'LOMO EMBUCHADO', price: 549, categoryName: 'Meat' },
      { name: 'QUESO CURADO', price: 489, categoryName: 'Dairy' },
      { name: 'PATE IBERICO', price: 329, categoryName: 'Meat' },
      { name: 'ANCHOAS', price: 399, categoryName: 'Meat' },
      { name: 'ACEITE TRUFA', price: 699, categoryName: 'Pantry' },
    ],
  },
  {
    storeName: 'Consum',
    storeNormalized: 'consum',
    daysAgo: 140,
    paymentMethod: 'cash',
    items: [
      { name: 'MELON PIEL SAPO', price: 349, categoryName: 'Produce' },
      { name: 'SANDIA', price: 299, quantity: 1, unit: 'kg', categoryName: 'Produce' },
      { name: 'UVAS BLANCAS', price: 279, categoryName: 'Produce' },
      { name: 'HIGOS FRESCOS', price: 399, categoryName: 'Produce' },
      { name: 'HORCHATA', price: 199, categoryName: 'Beverages' },
    ],
  },

  // 5 months ago
  {
    storeName: 'Alcampo',
    storeNormalized: 'alcampo',
    daysAgo: 155,
    paymentMethod: 'card',
    items: [
      { name: 'JAMON IBERICO', price: 2499, categoryName: 'Meat' },
      { name: 'QUESO CABRALES', price: 899, categoryName: 'Dairy' },
      { name: 'CAVA BRUT', price: 799, categoryName: 'Beverages' },
      { name: 'FOIE GRAS', price: 1299, categoryName: 'Meat' },
      { name: 'TURRON JIJONA', price: 549, categoryName: 'Snacks' },
    ],
  },
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 162,
    paymentMethod: 'card',
    items: [
      { name: 'BACALAO SALADO', price: 899, categoryName: 'Meat' },
      { name: 'GAMBAS BLANCAS', price: 1199, categoryName: 'Meat' },
      { name: 'MEJILLONES', price: 349, categoryName: 'Meat' },
      { name: 'ALMEJAS', price: 599, categoryName: 'Meat' },
      { name: 'PEREJIL FRESCO', price: 79, categoryName: 'Produce' },
    ],
  },
  {
    storeName: 'Lidl',
    storeNormalized: 'lidl',
    daysAgo: 170,
    paymentMethod: 'cash',
    items: [
      { name: 'TARTA CHOCOLATE', price: 499, categoryName: 'Bakery' },
      { name: 'BIZCOCHO CASERO', price: 299, categoryName: 'Bakery' },
      { name: 'PALMERAS HOJALDRE', price: 179, categoryName: 'Bakery' },
      { name: 'ROSCON REYES', price: 899, categoryName: 'Bakery' },
      { name: 'POLVORONES', price: 249, categoryName: 'Snacks' },
    ],
  },

  // 6 months ago
  {
    storeName: 'Eroski',
    storeNormalized: 'eroski',
    daysAgo: 185,
    paymentMethod: 'card',
    items: [
      { name: 'SOLOMILLO CERDO', price: 799, categoryName: 'Meat' },
      { name: 'COSTILLAS BBQ', price: 649, categoryName: 'Meat' },
      { name: 'SECRETO IBERICO', price: 1199, categoryName: 'Meat' },
      { name: 'SALSA BARBACOA', price: 249, categoryName: 'Pantry' },
      { name: 'CARBON VEGETAL', price: 599, categoryName: 'Other' },
    ],
  },
  {
    storeName: 'Mercadona',
    storeNormalized: 'mercadona',
    daysAgo: 192,
    paymentMethod: 'card',
    items: [
      { name: 'CERVEZA STEINBURG', price: 449, quantity: 12, categoryName: 'Beverages' },
      { name: 'REFRESCOS VARIADOS', price: 299, quantity: 6, categoryName: 'Beverages' },
      { name: 'PATATAS BARBACOA', price: 189, categoryName: 'Snacks' },
      { name: 'NACHOS QUESO', price: 229, categoryName: 'Snacks' },
      { name: 'GUACAMOLE', price: 349, categoryName: 'Produce' },
      { name: 'SALSA PICANTE', price: 179, categoryName: 'Pantry' },
    ],
  },
  {
    storeName: 'Carrefour',
    storeNormalized: 'carrefour',
    daysAgo: 200,
    paymentMethod: 'cash',
    items: [
      { name: 'LECHE SEMIDESNATADA', price: 109, quantity: 6, categoryName: 'Dairy' },
      { name: 'YOGUR GRIEGO', price: 299, quantity: 4, categoryName: 'Dairy' },
      { name: 'QUESO FRESCO', price: 189, categoryName: 'Dairy' },
      { name: 'NATILLAS', price: 149, quantity: 4, categoryName: 'Dairy' },
      { name: 'FLAN HUEVO', price: 199, quantity: 4, categoryName: 'Dairy' },
    ],
  },
];

export async function seedDemoData(): Promise<{ receiptsCreated: number; itemsCreated: number }> {
  logger.log('Starting demo data seed...');

  const allCategories = await db.select().from(categories);
  const categoryMap = new Map(allCategories.map((c) => [c.name, c.id]));

  const storeMap = new Map<string, number>();
  let receiptsCreated = 0;
  let itemsCreated = 0;

  for (const receiptData of DEMO_RECEIPTS) {
    let storeId = storeMap.get(receiptData.storeNormalized);

    if (!storeId) {
      const [store] = await db
        .insert(stores)
        .values({
          name: receiptData.storeName,
          normalizedName: receiptData.storeNormalized,
        })
        .returning();
      storeId = store.id;
      storeMap.set(receiptData.storeNormalized, storeId);
    }

    const totalAmount = receiptData.items.reduce((sum, item) => sum + item.price, 0);
    const taxAmount = Math.round(totalAmount * 0.1);
    const subtotal = totalAmount - taxAmount;

    const receiptDate = new Date(Date.now() - receiptData.daysAgo * 24 * 60 * 60 * 1000);

    const [receipt] = await db
      .insert(receipts)
      .values({
        storeId,
        dateTime: receiptDate,
        totalAmount,
        subtotal,
        taxAmount,
        paymentMethod: receiptData.paymentMethod,
        processingStatus: 'completed',
        confidence: 95,
      })
      .returning();

    receiptsCreated++;

    for (const itemData of receiptData.items) {
      const categoryId = categoryMap.get(itemData.categoryName) || categoryMap.get('Other') || 1;

      await db.insert(items).values({
        receiptId: receipt.id,
        name: itemData.name,
        normalizedName: itemData.name.toLowerCase().replace(/\s+/g, ''),
        price: itemData.price,
        quantity: itemData.quantity || 1,
        unit: itemData.unit,
        categoryId,
        confidence: 90,
      });

      itemsCreated++;
    }
  }

  logger.log(`Demo data seed complete: ${receiptsCreated} receipts, ${itemsCreated} items`);
  return { receiptsCreated, itemsCreated };
}

export async function clearAllData(): Promise<void> {
  logger.log('Clearing all data...');
  await db.delete(items);
  await db.delete(receipts);
  await db.delete(stores);
  logger.log('All data cleared');
}
