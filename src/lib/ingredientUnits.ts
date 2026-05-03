// Sistema de unidades para ingredientes basado en categorías

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

// Definición de categorías de unidades
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
      { value: 'docenas', label: 'Docenas', baseUnit: 'unidades', conversionFactor: 12 },
      { value: 'cajas', label: 'Cajas', baseUnit: 'unidades', conversionFactor: 1 }, // Se puede personalizar
      { value: 'paquetes', label: 'Paquetes', baseUnit: 'unidades', conversionFactor: 1 }
    ]
  },
  {
    id: 'portions',
    name: 'Porciones',
    description: 'Para ingredientes que se miden en porciones o cucharadas',
    units: [
      { value: 'porciones', label: 'Porciones', baseUnit: 'porciones', conversionFactor: 1 },
      { value: 'cucharadas', label: 'Cucharadas', baseUnit: 'porciones', conversionFactor: 0.0625 }, // 1/16 de porción
      { value: 'cucharaditas', label: 'Cucharaditas', baseUnit: 'porciones', conversionFactor: 0.0208 }, // 1/48 de porción
      { value: 'tazas', label: 'Tazas', baseUnit: 'porciones', conversionFactor: 1 }
    ]
  }
]

// Tipos de ingredientes sugeridos para cada categoría
export const INGREDIENT_TYPE_SUGGESTIONS = {
  weight: [
    'Carnes', 'Pollo', 'Pescado', 'Verduras', 'Frutas', 'Harinas', 'Azúcar', 
    'Sal', 'Especias', 'Quesos', 'Embutidos', 'Cereales', 'Legumbres'
  ],
  volume: [
    'Aceites', 'Leche', 'Crema', 'Jugos', 'Bebidas', 'Vinagre', 'Salsas líquidas',
    'Caldos', 'Vinos', 'Licores', 'Agua', 'Refrescos'
  ],
  units: [
    'Huevos', 'Botellas', 'Latas', 'Panes', 'Tortillas', 'Sobres', 
    'Tabletas', 'Pastillas', 'Bolsas individuales'
  ],
  portions: [
    'Condimentos', 'Extractos', 'Colorantes', 'Levadura', 'Polvo de hornear',
    'Esencias', 'Aderezos en polvo'
  ]
}

// Función para obtener unidades por categoría
export function getUnitsByCategory(categoryId: string): UnitOption[] {
  const category = UNIT_CATEGORIES.find(cat => cat.id === categoryId)
  return category ? category.units : []
}

// Función para obtener todas las unidades disponibles
export function getAllUnits(): UnitOption[] {
  return UNIT_CATEGORIES.flatMap(category => category.units)
}

// Función para obtener la categoría de una unidad
export function getUnitCategory(unitValue: string): UnitCategory | null {
  for (const category of UNIT_CATEGORIES) {
    if (category.units.some(unit => unit.value === unitValue)) {
      return category
    }
  }
  return null
}

// Función para sugerir categoría basada en el nombre del ingrediente
export function suggestUnitCategory(ingredientName: string): string {
  const name = ingredientName.toLowerCase()
  
  // Buscar en las sugerencias de cada categoría
  for (const [categoryId, suggestions] of Object.entries(INGREDIENT_TYPE_SUGGESTIONS)) {
    for (const suggestion of suggestions) {
      if (name.includes(suggestion.toLowerCase()) || suggestion.toLowerCase().includes(name)) {
        return categoryId
      }
    }
  }
  
  // Palabras clave específicas
  if (name.includes('aceite') || name.includes('leche') || name.includes('jugo') || 
      name.includes('bebida') || name.includes('líquido') || name.includes('salsa')) {
    return 'volume'
  }
  
  if (name.includes('carne') || name.includes('pollo') || name.includes('pescado') || 
      name.includes('verdura') || name.includes('fruta') || name.includes('harina')) {
    return 'weight'
  }
  
  if (name.includes('huevo') || name.includes('botella') || name.includes('lata') || 
      name.includes('unidad') || name.includes('pieza')) {
    return 'units'
  }
  
  // Por defecto, sugerir peso para ingredientes sólidos
  return 'weight'
}

// Función para convertir entre unidades de la misma categoría
export function convertUnit(
  value: number, 
  fromUnit: string, 
  toUnit: string
): number | null {
  const allUnits = getAllUnits()
  const fromUnitData = allUnits.find(u => u.value === fromUnit)
  const toUnitData = allUnits.find(u => u.value === toUnit)
  
  if (!fromUnitData || !toUnitData || fromUnitData.baseUnit !== toUnitData.baseUnit) {
    return null // No se puede convertir entre diferentes tipos de unidades
  }
  
  // Convertir a unidad base y luego a la unidad destino
  const baseValue = value * fromUnitData.conversionFactor
  return baseValue / toUnitData.conversionFactor
}