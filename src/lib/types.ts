import type { Tables } from './database.types'

export type Household = Tables<'households'>
export type HouseholdMember = Tables<'household_members'>
export type Product = Tables<'products'>
export type InventoryItem = Tables<'inventory_items'>
export type InventoryMovement = Tables<'inventory_movements'>
export type ShoppingListItem = Tables<'shopping_list_items'>
export type Recipe = Tables<'recipes'>
export type RecipeIngredient = Tables<'recipe_ingredients'>

export type InventoryItemWithProduct = InventoryItem & { product: Product }
export type ShoppingListItemWithProduct = ShoppingListItem & { product: Product | null }

export const LOCATIONS = ['dispensa', 'frigo', 'freezer', 'cantina', 'altro'] as const
export const UNITS = ['pz', 'g', 'kg', 'ml', 'l'] as const

export const LOCATION_LABELS: Record<string, string> = {
  dispensa: 'Dispensa',
  frigo: 'Frigo',
  freezer: 'Freezer',
  cantina: 'Cantina',
  altro: 'Altro',
}
