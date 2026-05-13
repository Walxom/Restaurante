
// 🧠 Sistema Unificado de Unidades y Conversiones
// Fusiona la robustez de ingredientUnits.ts con la simplicidad de unitConversions.ts

export interface UnitOption {
  value: string
  label: string
  baseUnit: string // Para conversiones
  conversionFactor: number // Factor de conversión a la unidad base
}

export interface UnitCategory {
  id: string
  name: string
  description: string
  units: UnitOption[]
}

// Definición de categorías de unidades (del sistema robusto)
export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: 'weight',
    name: 'Peso',
    description: 'Para ingredientes sólidos como carnes, verduras, harinas',
    units: [
      { value: 'kg', label: 'Kilogramos (kg)', baseUnit: 'kg', conversionFactor: 1 },
      { value: 'g', label: 'Gramos (g)', baseUnit: 'kg', conversionFactor: 0.001 },
      { value: 'lb', label: 'Libras (lb)', baseUnit: 'kg', conversionFactor: 0.453592 },
      { value: 'oz', label: 'Onzas (oz)', baseUnit: 'kg', conversionFactor: 0.0283495 }
    ]
  },
  {
    id: 'volume',
    name: 'Volumen',
    description: 'Para líquidos como aceites, leche, bebidas',
    units: [
      { value: 'l', label: 'Litros (l)', baseUnit: 'l', conversionFactor: 1 },
      { value: 'ml', label: 'Mililitros (ml)', baseUnit: 'l', conversionFactor: 0.001 },
      { value: 'gal', label: 'Galones (gal)', baseUnit: 'l', conversionFactor: 3.78541 },
      { value: 'fl_oz', label: 'Onzas líquidas (fl oz)', baseUnit: 'l', conversionFactor: 0.0295735 }
    ]
  },
  {
    id: 'units',
    name: 'Unidades',
    description: 'Para productos individuales como huevos, botellas, latas',
    units: [
      { value: 'unidades', label: 'Unidades', baseUnit: 'unidades', conversionFactor: 1 },
      { value: 'piezas', label: 'Piezas', baseUnit: 'unidades', conversionFactor: 1 },
      { value: 'docenas', label: 'Docenas', baseUnit: 'unidades', conversionFactor: 12 },
      { value: 'cajas', label: 'Cajas', baseUnit: 'unidades', conversionFactor: 1 },
      { value: 'paquetes', label: 'Paquetes', baseUnit: 'unidades', conversionFactor: 1 }
    ]
  },
  {
    id: 'portions',
    name: 'Porciones',
    description: 'Para ingredientes que se miden en porciones o cucharadas',
    units: [
      { value: 'porciones', label: 'Porciones', baseUnit: 'porciones', conversionFactor: 1 },
      { value: 'cucharadas', label: 'Cucharadas', baseUnit: 'porciones', conversionFactor: 0.0625 }, 
      { value: 'cucharaditas', label: 'Cucharaditas', baseUnit: 'porciones', conversionFactor: 0.0208 },
      { value: 'tazas', label: 'Tazas', baseUnit: 'porciones', conversionFactor: 1 }
    ]
  }
]

export const INGREDIENT_TYPE_SUGGESTIONS = {
  weight: ['Carnes', 'Pollo', 'Pescado', 'Verduras', 'Frutas', 'Harinas', 'Azúcar', 'Sal', 'Especias', 'Quesos', 'Embutidos'],
  volume: ['Aceites', 'Leche', 'Crema', 'Jugos', 'Bebidas', 'Vinagre', 'Salsas', 'Caldos', 'Vinos', 'Agua'],
  units: ['Huevos', 'Botellas', 'Latas', 'Panes', 'Tortillas', 'Sobres', 'Tabletas', 'Piezas'],
  portions: ['Condimentos', 'Extractos', 'Levadura', 'Esencias']
}

// --- FUNCIONES CORE ---

export function getAllUnits(): UnitOption[] {
  return UNIT_CATEGORIES.flatMap(category => category.units)
}

export function getUnitsByCategory(categoryId: string): UnitOption[] {
  const category = UNIT_CATEGORIES.find(cat => cat.id === categoryId)
  return category ? category.units : []
}

export function getUnitCategory(unitValue: string): UnitCategory | null {
  const val = unitValue.toLowerCase()
  return UNIT_CATEGORIES.find(cat => cat.units.some(u => u.value === val)) || null
}

// --- FUNCIONES DE COMPATIBILIDAD Y ETIQUETAS ---

/**
 * Obtiene la etiqueta de la unidad. 
 * Si clean es true, devuelve "Kilogramos" en lugar de "Kilogramos (kg)"
 */
export function getUnitLabel(unitValue: string, clean: boolean = false): string {
  const unit = getAllUnits().find(u => u.value.toLowerCase() === unitValue.toLowerCase())
  if (!unit) return unitValue
  
  if (clean) {
    return unit.label.split(' (')[0]
  }
  return unit.label
}

export function getCompatibleUnits(unitValue: string): string[] {
  const category = getUnitCategory(unitValue)
  return category ? category.units.map(u => u.value) : [unitValue]
}

export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  if (unit1.toLowerCase() === unit2.toLowerCase()) return true
  const cat1 = getUnitCategory(unit1)
  const cat2 = getUnitCategory(unit2)
  return !!cat1 && !!cat2 && cat1.id === cat2.id
}

// --- FUNCIONES DE CONVERSIÓN ---

export function convertUnit(value: number, fromUnit: string, toUnit: string): number {
  if (fromUnit.toLowerCase() === toUnit.toLowerCase()) return value

  const allUnits = getAllUnits()
  const from = allUnits.find(u => u.value.toLowerCase() === fromUnit.toLowerCase())
  const to = allUnits.find(u => u.value.toLowerCase() === toUnit.toLowerCase())
  
  if (!from || !to || from.baseUnit !== to.baseUnit) {
    console.warn(`No se puede convertir de ${fromUnit} a ${toUnit}`)
    return value 
  }
  
  const baseValue = value * from.conversionFactor
  return baseValue / to.conversionFactor
}

/**
 * Convierte una cantidad a la unidad base definida para el ingrediente.
 * Preserva la lógica de logging y validación de unitConversions.ts
 */
export function convertToBaseUnit(quantity: number, fromUnit: string, baseUnit: string): number {
  // Si las unidades son iguales o muy similares, no convertir (evita errores de redondeo innecesarios)
  if (fromUnit.toLowerCase() === baseUnit.toLowerCase() || 
      fromUnit.toLowerCase().includes(baseUnit.toLowerCase()) ||
      baseUnit.toLowerCase().includes(fromUnit.toLowerCase())) {
    console.log(`[Units] Unidades similares detectadas: ${fromUnit} -> ${baseUnit}, no se requiere conversión`)
    return quantity
  }

  const converted = convertUnit(quantity, fromUnit, baseUnit)
  console.log(`[Units] Conversión: ${quantity} ${fromUnit} -> ${converted} ${baseUnit}`)
  return converted
}

// --- UTILIDADES ---

export function suggestUnitCategory(ingredientName: string): string {
  const name = ingredientName.toLowerCase()
  
  // 1. Buscar en las sugerencias de cada categoría
  for (const [categoryId, suggestions] of Object.entries(INGREDIENT_TYPE_SUGGESTIONS)) {
    if (suggestions.some(s => name.includes(s.toLowerCase()) || s.toLowerCase().includes(name))) {
      return categoryId
    }
  }
  
  // 2. Palabras clave específicas (restauradas de ingredientUnits.ts)
  if (name.includes('aceite') || name.includes('leche') || name.includes('jugo') || 
      name.includes('bebida') || name.includes('líquido') || name.includes('salsa') || name.includes('vinagre')) {
    return 'volume'
  }
  
  if (name.includes('carne') || name.includes('pollo') || name.includes('pescado') || 
      name.includes('verdura') || name.includes('fruta') || name.includes('harina') || name.includes('arroz')) {
    return 'weight'
  }
  
  if (name.includes('huevo') || name.includes('botella') || name.includes('lata') || 
      name.includes('unidad') || name.includes('pieza') || name.includes('pan')) {
    return 'units'
  }
  
  return 'weight' // Por defecto sugerir peso para ingredientes sólidos
}
