import { NextResponse } from 'next/server'
import { validateRUC } from '@/features/billing/validations/documents'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const numero = searchParams.get('numero')

  if (!numero) {
    return NextResponse.json({ error: 'El número de RUC es obligatorio' }, { status: 400 })
  }

  // Validar formato de RUC usando utilidad
  const validation = validateRUC(numero)
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    // Crear AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 segundos timeout

    const response = await fetch(`https://api.decolecta.com/v1/sunat/ruc?numero=${numero}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DECOLECTA_API_KEY}`
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          error: `El RUC ${numero} no fue encontrado en la base de datos de SUNAT. Verifique que el número sea correcto.` 
        }, { status: 404 })
      }
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Error de autenticación con el servicio de SUNAT. Contacte al administrador.' 
        }, { status: 401 })
      }
      if (response.status === 429) {
        return NextResponse.json({ 
          error: 'Demasiadas consultas. Intente nuevamente en unos momentos.' 
        }, { status: 429 })
      }
      return NextResponse.json({ 
        error: `Error al consultar SUNAT (Código: ${response.status}). Intente nuevamente.` 
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Validar que la respuesta tenga datos válidos
    if (!data.razon_social) {
      return NextResponse.json({ 
        error: `El RUC ${numero} existe pero no tiene datos completos en SUNAT.` 
      }, { status: 422 })
    }
    
    // Normalizar respuesta
    return NextResponse.json({
      success: true,
      data: {
        ruc: data.numero_documento || numero,
        razonSocial: data.razon_social || '',
        nombreComercial: data.nombre_comercial || '',
        estado: data.estado || '',
        condicion: data.condicion || '',
        direccion: data.direccion || '',
        departamento: data.departamento || '',
        provincia: data.provincia || '',
        distrito: data.distrito || '',
        actividadEconomica: data.actividad_economica || ''
      }
    })
  } catch (error: any) {
    console.error('Error consultando RUC:', error)
    
    // Manejo específico de errores
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        error: 'La consulta de RUC tardó demasiado tiempo. Verifique su conexión a internet e intente nuevamente.' 
      }, { status: 408 })
    }
    
    if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.code === 'ECONNRESET') {
      return NextResponse.json({ 
        error: 'Tiempo de espera agotado al consultar SUNAT. Intente nuevamente en unos momentos.' 
      }, { status: 408 })
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return NextResponse.json({ 
        error: 'No se pudo conectar con el servicio de SUNAT. Verifique su conexión a internet.' 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: 'Error interno al consultar RUC. Intente nuevamente o contacte al administrador.' 
    }, { status: 500 })
  }
}