// Utilidades para conversión de unidades

export interface UnitConversion {
  from: string
  to: string
  factor: number
}

// Definición de conversiones de unidades
export const UNIT_CONVERSIONS: UnitConversion[] = [
  // Peso - Base: kg
  { from: 'kg', to: 'g', factor: 1000 },
  { from: 'g', to: 'kg', factor: 0.001 },
  
  // Volumen - Base: l
  { from: 'l', to: 'ml', factor: 1000 },
  { from: 'ml', to: 'l', factor: 0.001 },
  
  // Unidades (no necesitan conversión)
  { from: 'unidades', to: 'unidades', factor: 1 },
  { from: 'piezas', to: 'piezas', factor: 1 },
]

// Grupos de unidades compatibles
export const UNIT_GROUPS = {
  peso: ['kg', 'g'],
  volumen: ['l', 'ml'],
  cantidad: ['unidades', 'piezas']
}

// Obtener unidades compatibles para una unidad base
export function getCompatibleUnits(baseUnit: string): string[] {
  for (const [groupName, units] of Object.entries(UNIT_GROUPS)) {
    if (units.includes(baseUnit.toLowerCase())) {
      return units
    }
  }
  return [baseUnit] // Si no encuentra grupo, devuelve solo la unidad original
}

// Convertir cantidad de una unidad a otra
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  // Si las unidades son iguales, no hay conversión
  if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return quantity
  }

  // Buscar conversión directa
  const directConversion = UNIT_CONVERSIONS.find(
    conv => conv.from.toLowerCase() === fromUnit.toLowerCase() && 
            conv.to.toLowerCase() === toUnit.toLowerCase()
  )

  if (directConversion) {
    return quantity * directConversion.factor
  }

  // Si no hay conversión directa, intentar conversión inversa
  const inverseConversion = UNIT_CONVERSIONS.find(
    conv => conv.to.toLowerCase() === fromUnit.toLowerCase() && 
            conv.from.toLowerCase() === toUnit.toLowerCase()
  )

  if (inverseConversion) {
    return quantity / inverseConversion.factor
  }

  // Si no se puede convertir, devolver la cantidad original
  console.warn(`No se puede convertir de ${fromUnit} a ${toUnit}`)
  return quantity
}

// Convertir cantidad a la unidad base del ingrediente (para descontar del stock)
export function convertToBaseUnit(quantity: number, fromUnit: string, baseUnit: string): number {
  // Si las unidades son iguales o muy similares, no convertir
  if (fromUnit.toLowerCase() === baseUnit.toLowerCase() || 
      fromUnit.toLowerCase().includes(baseUnit.toLowerCase()) ||
      baseUnit.toLowerCase().includes(fromUnit.toLowerCase())) {
    console.log(`Unidades similares detectadas: ${fromUnit} -> ${baseUnit}, no se convierte`)
    return quantity
  }

  const converted = convertUnit(quantity, fromUnit, baseUnit)
  console.log(`Conversión: ${quantity} ${fromUnit} -> ${converted} ${baseUnit}`)
  return converted
}

// Obtener la etiqueta de la unidad para mostrar en la UI
export function getUnitLabel(unit: string): string {
  const labels: { [key: string]: string } = {
    'kg': 'Kilogramos',
    'g': 'Gramos',
    'l': 'Litros',
    'ml': 'Mililitros',
    'unidades': 'Unidades',
    'piezas': 'Piezas'
  }
  
  return labels[unit.toLowerCase()] || unit
}

// Validar si dos unidades son compatibles
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const compatibleUnits = getCompatibleUnits(unit1)
  return compatibleUnits.includes(unit2.toLowerCase())
}