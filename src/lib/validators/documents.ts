/**
 * Utilidades para validación de documentos peruanos
 */

export interface DocumentValidationResult {
  isValid: boolean
  error?: string
  type?: 'dni' | 'ruc'
}

/**
 * Valida formato de DNI peruano
 */
export function validateDNI(dni: string): DocumentValidationResult {
  // Remover espacios y caracteres no numéricos
  const cleanDNI = dni.replace(/\D/g, '')
  
  if (!cleanDNI) {
    return { isValid: false, error: 'DNI es requerido' }
  }
  
  if (cleanDNI.length !== 8) {
    return { isValid: false, error: 'DNI debe tener exactamente 8 dígitos' }
  }
  
  // Validar que no sean todos números iguales
  if (/^(\d)\1{7}$/.test(cleanDNI)) {
    return { isValid: false, error: 'DNI no puede tener todos los dígitos iguales' }
  }
  
  return { isValid: true, type: 'dni' }
}

/**
 * Valida formato de RUC peruano
 */
export function validateRUC(ruc: string): DocumentValidationResult {
  // Remover espacios y caracteres no numéricos
  const cleanRUC = ruc.replace(/\D/g, '')
  
  if (!cleanRUC) {
    return { isValid: false, error: 'RUC es requerido' }
  }
  
  if (cleanRUC.length !== 11) {
    return { isValid: false, error: 'RUC debe tener exactamente 11 dígitos' }
  }
  
  // Validar que no sean todos números iguales
  if (/^(\d)\1{10}$/.test(cleanRUC)) {
    return { isValid: false, error: 'RUC no puede tener todos los dígitos iguales' }
  }
  
  // Validar primer dígito (tipo de RUC)
  const firstDigit = cleanRUC[0]
  const validFirstDigits = ['1', '2'] // 10: DNI, 20: Empresas
  
  if (!validFirstDigits.includes(firstDigit)) {
    return { isValid: false, error: 'RUC debe comenzar con 10 o 20' }
  }
  
  // Validar dígito verificador (algoritmo módulo 11)
  if (!validateRUCCheckDigit(cleanRUC)) {
    return { isValid: false, error: 'RUC tiene un dígito verificador inválido' }
  }
  
  return { isValid: true, type: 'ruc' }
}

/**
 * Valida el dígito verificador del RUC usando algoritmo módulo 11
 */
function validateRUCCheckDigit(ruc: string): boolean {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const digits = ruc.substring(0, 10).split('').map(Number)
  const checkDigit = parseInt(ruc[10])
  
  let sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * weights[i]
  }
  
  const remainder = sum % 11
  const calculatedCheckDigit = remainder < 2 ? remainder : 11 - remainder
  
  return calculatedCheckDigit === checkDigit
}

/**
 * Detecta automáticamente el tipo de documento y lo valida
 */
export function validateDocument(document: string): DocumentValidationResult {
  const cleanDocument = document.replace(/\D/g, '')
  
  if (cleanDocument.length === 8) {
    return validateDNI(cleanDocument)
  } else if (cleanDocument.length === 11) {
    return validateRUC(cleanDocument)
  } else {
    return { 
      isValid: false, 
      error: 'Documento debe tener 8 dígitos (DNI) o 11 dígitos (RUC)' 
    }
  }
}

/**
 * Formatea un documento para mostrar
 */
export function formatDocument(document: string, type?: 'dni' | 'ruc'): string {
  const cleanDocument = document.replace(/\D/g, '')
  
  if (type === 'dni' || cleanDocument.length === 8) {
    // Formato: 12345678
    return cleanDocument
  } else if (type === 'ruc' || cleanDocument.length === 11) {
    // Formato: 20123456789
    return cleanDocument
  }
  
  return cleanDocument
}

/**
 * Limpia un documento removiendo caracteres no numéricos
 */
export function cleanDocument(document: string): string {
  return document.replace(/\D/g, '')
}