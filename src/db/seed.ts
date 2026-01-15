import { db } from './client';
import { categories } from './schema';
import { eq } from 'drizzle-orm';

export const DEFAULT_CATEGORIES = [
  {
    name: 'Produce',
    icon: '🥬',
    color: '#93BD57',
    keywords: ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'carrot', 'onion', 'potato', 'fruit', 'vegetable', 'organic', 'avocado', 'lemon', 'lime', 'grape', 'berry', 'melon', 'cucumber', 'pepper', 'broccoli', 'spinach', 'kale'],
    isDefault: true,
  },
  {
    name: 'Dairy',
    icon: '🥛',
    color: '#5BA4D9',
    keywords: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg', 'eggs', 'sour cream', 'cottage', 'mozzarella', 'cheddar', 'parmesan'],
    isDefault: true,
  },
  {
    name: 'Meat',
    icon: '🥩',
    color: '#980404',
    keywords: ['beef', 'chicken', 'pork', 'turkey', 'fish', 'salmon', 'steak', 'ground', 'bacon', 'sausage', 'ham', 'lamb', 'shrimp', 'tuna', 'meat'],
    isDefault: true,
  },
  {
    name: 'Bakery',
    icon: '🍞',
    color: '#FBE580',
    keywords: ['bread', 'bagel', 'muffin', 'cake', 'cookie', 'donut', 'pastry', 'croissant', 'roll', 'bun', 'tortilla', 'pita'],
    isDefault: true,
  },
  {
    name: 'Beverages',
    icon: '🥤',
    color: '#8B7EC8',
    keywords: ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'drink', 'cola', 'sprite', 'energy', 'smoothie', 'milk'],
    isDefault: true,
  },
  {
    name: 'Frozen',
    icon: '🧊',
    color: '#4DB6AC',
    keywords: ['frozen', 'ice cream', 'pizza', 'meals', 'fries', 'popsicle', 'gelato', 'sorbet', 'frozen dinner'],
    isDefault: true,
  },
  {
    name: 'Pantry',
    icon: '🥫',
    color: '#E8976C',
    keywords: ['rice', 'pasta', 'sauce', 'soup', 'canned', 'cereal', 'flour', 'sugar', 'oil', 'beans', 'spices', 'seasoning', 'salt', 'pepper', 'vinegar', 'honey', 'jam', 'peanut butter', 'noodles'],
    isDefault: true,
  },
  {
    name: 'Snacks',
    icon: '🍿',
    color: '#F4A261',
    keywords: ['chips', 'crackers', 'popcorn', 'candy', 'chocolate', 'nuts', 'pretzels', 'cookies', 'granola', 'bar', 'trail mix'],
    isDefault: true,
  },
  {
    name: 'Household',
    icon: '🧹',
    color: '#8D8680',
    keywords: ['paper', 'towel', 'tissue', 'detergent', 'soap', 'cleaner', 'trash', 'bag', 'foil', 'wrap', 'sponge', 'bleach', 'dishwasher'],
    isDefault: true,
  },
  {
    name: 'Personal Care',
    icon: '🧴',
    color: '#DDA0DD',
    keywords: ['shampoo', 'toothpaste', 'deodorant', 'razor', 'lotion', 'soap', 'conditioner', 'body wash', 'sunscreen', 'makeup', 'skincare'],
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
  // Check if categories already exist
  const existingCategories = await db.select().from(categories).limit(1);

  if (existingCategories.length > 0) {
    console.log('Categories already seeded');
    return;
  }

  // Insert default categories
  for (const category of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({
      name: category.name,
      icon: category.icon,
      color: category.color,
      keywords: category.keywords,
      isDefault: category.isDefault,
    });
  }

  console.log('Default categories seeded successfully');
}

export async function getCategoryByKeyword(keyword: string): Promise<number | null> {
  const normalizedKeyword = keyword.toLowerCase();

  const allCategories = await db.select().from(categories);

  for (const category of allCategories) {
    const keywords = category.keywords || [];
    if (keywords.some(k => normalizedKeyword.includes(k.toLowerCase()))) {
      return category.id;
    }
  }

  // Return "Other" category if no match
  const otherCategory = allCategories.find(c => c.name === 'Other');
  return otherCategory?.id || null;
}
