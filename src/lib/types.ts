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

// Le posizioni sono ora personalizzabili per nucleo familiare (vedi
// CatalogContext / household_locations), non più un elenco fisso pensato
// solo per il cibo. UNITS resta fisso: sono unità di misura, non cambiano
// da nucleo a nucleo.
export const UNITS = ['pz', 'g', 'kg', 'ml', 'l'] as const
