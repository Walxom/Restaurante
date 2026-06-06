import { NextResponse } from 'next/server'
import { validateRole } from '@/lib/auth-utils'

export async function POST(req: Request) {
  const auth = await validateRole(['JEFE', 'MESERO'])
  if (!auth.isValid) return auth.response

  try {
    const { tipo, numero } = await req.json()

    if (!tipo || !numero) {
      return NextResponse.json({ 
        error: 'Los campos tipo y numero son obligatorios' 
      }, { status: 400 })
    }

    let apiEndpoint = ''
    let validationRegex: RegExp
    let errorMessage = ''

    switch (tipo) {
      case 'dni':
        apiEndpoint = '/api/external/peru/dni'
        validationRegex = /^\d{8}$/
        errorMessage = 'El DNI debe tener exactamente 8 dígitos'
        break
      
      case 'ruc':
        apiEndpoint = '/api/external/peru/ruc'
        validationRegex = /^\d{11}$/
        errorMessage = 'El RUC debe tener exactamente 11 dígitos'
        break
      
      default:
        return NextResponse.json({
          error: 'Tipo de documento no válido. Use "dni" o "ruc"'
        }, { status: 400 })
    }

    // Validar formato
    if (!validationRegex.test(numero)) {
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    // Hacer la consulta a la API correspondiente
    const baseUrl = req.headers.get('host')
    const protocol = req.headers.get('x-forwarded-proto') || 'http'
    const fullUrl = `${protocol}://${baseUrl}${apiEndpoint}?numero=${numero}`

    const cookieHeader = req.headers.get('cookie')
    const response = await fetch(fullUrl, {
      headers: cookieHeader ? { cookie: cookieHeader } : {}
    })
    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      tipo,
      numero,
      data: data.data
    })

  } catch (error) {
    console.error('Error validando cliente:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}