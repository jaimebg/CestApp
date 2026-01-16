import { db } from './client';
import { categories, userLearnedItems } from './schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Default categories with multilingual keywords (English + Spanish)
 * Keywords are used for automatic categorization of scanned items
 */
export const DEFAULT_CATEGORIES = [
  {
    name: 'Produce',
    icon: '🥬',
    color: '#93BD57',
    keywords: [
      'apple',
      'banana',
      'orange',
      'lettuce',
      'tomato',
      'carrot',
      'onion',
      'potato',
      'fruit',
      'vegetable',
      'organic',
      'avocado',
      'lemon',
      'lime',
      'grape',
      'berry',
      'melon',
      'cucumber',
      'pepper',
      'broccoli',
      'spinach',
      'kale',
      'celery',
      'garlic',
      'manzana',
      'platano',
      'naranja',
      'lechuga',
      'tomate',
      'zanahoria',
      'cebolla',
      'papa',
      'patata',
      'fruta',
      'verdura',
      'aguacate',
      'limon',
      'uva',
      'fresa',
      'melon',
      'sandia',
      'pepino',
      'pimiento',
      'brocoli',
      'espinaca',
      'apio',
      'ajo',
    ],
    isDefault: true,
  },
  {
    name: 'Dairy',
    icon: '🥛',
    color: '#5BA4D9',
    keywords: [
      'milk',
      'cheese',
      'yogurt',
      'butter',
      'cream',
      'egg',
      'eggs',
      'sour cream',
      'cottage',
      'mozzarella',
      'cheddar',
      'parmesan',
      'dairy',
      'half and half',
      'leche',
      'queso',
      'yogur',
      'mantequilla',
      'crema',
      'huevo',
      'huevos',
      'nata',
      'requeson',
      'lacteo',
      'lacteos',
      'quesillo',
      'queso fresco',
    ],
    isDefault: true,
  },
  {
    name: 'Meat',
    icon: '🥩',
    color: '#980404',
    keywords: [
      'beef',
      'chicken',
      'pork',
      'turkey',
      'fish',
      'salmon',
      'steak',
      'ground',
      'bacon',
      'sausage',
      'ham',
      'lamb',
      'shrimp',
      'tuna',
      'meat',
      'seafood',
      'tilapia',
      'carne',
      'pollo',
      'cerdo',
      'pavo',
      'pescado',
      'res',
      'bistec',
      'molida',
      'tocino',
      'salchicha',
      'jamon',
      'cordero',
      'camaron',
      'atun',
      'mariscos',
      'carnitas',
      'chorizo',
      'costilla',
      'chuleta',
    ],
    isDefault: true,
  },
  {
    name: 'Bakery',
    icon: '🍞',
    color: '#FBE580',
    keywords: [
      'bread',
      'bagel',
      'muffin',
      'cake',
      'cookie',
      'donut',
      'pastry',
      'croissant',
      'roll',
      'bun',
      'tortilla',
      'pita',
      'baguette',
      'sourdough',
      'rye',
      'pan',
      'bolillo',
      'dona',
      'pastel',
      'galleta',
      'panecillo',
      'concha',
      'cuerno',
      'telera',
      'birote',
      'polvoron',
      'empanada',
      'churro',
      'rosca',
    ],
    isDefault: true,
  },
  {
    name: 'Beverages',
    icon: '🥤',
    color: '#8B7EC8',
    keywords: [
      'water',
      'juice',
      'soda',
      'coffee',
      'tea',
      'beer',
      'wine',
      'drink',
      'cola',
      'sprite',
      'energy',
      'smoothie',
      'lemonade',
      'sparkling',
      'beverage',
      'agua',
      'jugo',
      'refresco',
      'cafe',
      'te',
      'cerveza',
      'vino',
      'bebida',
      'limonada',
      'horchata',
      'jamaica',
      'tamarindo',
      'gaseosa',
      'licuado',
    ],
    isDefault: true,
  },
  {
    name: 'Frozen',
    icon: '🧊',
    color: '#4DB6AC',
    keywords: [
      'frozen',
      'ice cream',
      'pizza',
      'meals',
      'fries',
      'popsicle',
      'gelato',
      'sorbet',
      'frozen dinner',
      'tv dinner',
      'ice',
      'freezer',
      'congelado',
      'helado',
      'paleta',
      'papas fritas',
      'comida congelada',
      'nieve',
      'hielo',
      'pizza congelada',
    ],
    isDefault: true,
  },
  {
    name: 'Pantry',
    icon: '🥫',
    color: '#E8976C',
    keywords: [
      'rice',
      'pasta',
      'sauce',
      'soup',
      'canned',
      'cereal',
      'flour',
      'sugar',
      'oil',
      'beans',
      'spices',
      'seasoning',
      'salt',
      'pepper',
      'vinegar',
      'honey',
      'jam',
      'peanut butter',
      'noodles',
      'oatmeal',
      'syrup',
      'arroz',
      'fideos',
      'salsa',
      'sopa',
      'enlatado',
      'cereal',
      'harina',
      'azucar',
      'aceite',
      'frijoles',
      'especias',
      'condimento',
      'sal',
      'pimienta',
      'vinagre',
      'miel',
      'mermelada',
      'crema de cacahuate',
      'avena',
      'jarabe',
      'lata',
    ],
    isDefault: true,
  },
  {
    name: 'Snacks',
    icon: '🍿',
    color: '#F4A261',
    keywords: [
      'chips',
      'crackers',
      'popcorn',
      'candy',
      'chocolate',
      'nuts',
      'pretzels',
      'cookies',
      'granola',
      'bar',
      'trail mix',
      'gummies',
      'snack',
      'papas',
      'galletas saladas',
      'palomitas',
      'dulce',
      'dulces',
      'nueces',
      'cacahuates',
      'botana',
      'frituras',
      'chicharron',
      'gomitas',
      'chocolates',
    ],
    isDefault: true,
  },
  {
    name: 'Household',
    icon: '🧹',
    color: '#8D8680',
    keywords: [
      'paper',
      'towel',
      'tissue',
      'detergent',
      'soap',
      'cleaner',
      'trash',
      'bag',
      'foil',
      'wrap',
      'sponge',
      'bleach',
      'dishwasher',
      'laundry',
      'cleaning',
      'papel',
      'toalla',
      'servilleta',
      'detergente',
      'jabon',
      'limpiador',
      'basura',
      'bolsa',
      'aluminio',
      'esponja',
      'cloro',
      'lavaplatos',
      'limpieza',
    ],
    isDefault: true,
  },
  {
    name: 'Personal Care',
    icon: '🧴',
    color: '#DDA0DD',
    keywords: [
      'shampoo',
      'toothpaste',
      'deodorant',
      'razor',
      'lotion',
      'soap',
      'conditioner',
      'body wash',
      'sunscreen',
      'makeup',
      'skincare',
      'hygiene',
      'dental',
      'champu',
      'pasta dental',
      'desodorante',
      'rastrillo',
      'crema',
      'jabon',
      'acondicionador',
      'gel de bano',
      'protector solar',
      'maquillaje',
      'higiene',
    ],
    isDefault: true,
  },
  {
    name: 'Other',
    icon: '📦',
    color: '#A0A0A0',
    keywords: [],
    isDefault: true,
  },
];

export async function seedCategories() {
  const existingCategories = await db.select().from(categories).limit(1);

  if (existingCategories.length > 0) {
    return;
  }

  for (const category of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({
      name: category.name,
      icon: category.icon,
      color: category.color,
      keywords: category.keywords,
      isDefault: category.isDefault,
    });
  }
}

/**
 * Normalizes an item name for consistent matching
 * - Lowercases
 * - Trims whitespace
 * - Removes common suffixes/prefixes
 */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^\d+\s*x\s*/i, '')
    .replace(/\s*\d+\s*(oz|lb|kg|g|ml|l|ct|pk|pc)\.?$/i, '')
    .trim();
}

/**
 * Gets category for an item, checking in order:
 * 1. User learned items (highest priority - user corrections)
 * 2. Keyword matching (fallback)
 * 3. "Other" category (default if no match)
 *
 * @param itemName - The item name to categorize
 * @param storeId - Optional store ID for store-specific learning
 */
export async function getCategoryForItem(
  itemName: string,
  storeId?: number | null
): Promise<{ categoryId: number; confidence: number; source: 'learned' | 'keyword' | 'default' }> {
  const normalizedName = normalizeItemName(itemName);

  const learnedItems = await db
    .select()
    .from(userLearnedItems)
    .where(eq(userLearnedItems.normalizedName, normalizedName));

  const storeSpecific = storeId ? learnedItems.find((item) => item.storeId === storeId) : null;
  const global = learnedItems.find((item) => item.storeId === null);
  const learned = storeSpecific || global;

  if (learned) {
    const confidence = Math.min(90 + learned.correctionCount * 2, 100);
    return { categoryId: learned.categoryId, confidence, source: 'learned' };
  }

  const allCategories = await db.select().from(categories);

  for (const category of allCategories) {
    const keywords = category.keywords || [];
    if (keywords.some((k) => normalizedName.includes(k.toLowerCase()))) {
      return { categoryId: category.id, confidence: 70, source: 'keyword' };
    }
  }

  const otherCategory = allCategories.find((c) => c.name === 'Other');
  return {
    categoryId: otherCategory?.id || 1,
    confidence: 50,
    source: 'default',
  };
}

/**
 * Records a user category correction for learning
 * If the item-category mapping already exists, increments the correction count
 */
export async function recordUserCorrection(
  itemName: string,
  categoryId: number,
  storeId?: number | null
): Promise<void> {
  const normalizedName = normalizeItemName(itemName);

  const conditions = [eq(userLearnedItems.normalizedName, normalizedName)];
  if (storeId) {
    conditions.push(eq(userLearnedItems.storeId, storeId));
  } else {
    conditions.push(isNull(userLearnedItems.storeId));
  }

  const existing = await db
    .select()
    .from(userLearnedItems)
    .where(and(...conditions))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(userLearnedItems)
      .set({
        categoryId,
        correctionCount: existing[0].correctionCount + 1,
        lastUsedAt: new Date(),
      })
      .where(eq(userLearnedItems.id, existing[0].id));
  } else {
    await db.insert(userLearnedItems).values({
      normalizedName,
      categoryId,
      storeId: storeId || null,
      correctionCount: 1,
    });
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getCategoryForItem instead
 */
export async function getCategoryByKeyword(keyword: string): Promise<number | null> {
  const result = await getCategoryForItem(keyword);
  return result.categoryId;
}
