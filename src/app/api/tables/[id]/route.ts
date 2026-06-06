import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"



// GET - Obtener información de una mesa específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const tableId = id

    const table = await prisma.table.findUnique({
      where: { id: tableId },
      include: {
        orders: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          },
          include: {
            orderItems: {
              include: {
                product: {
                  select: {
                    name: true,
                    price: true
                  }
                }
              }
            },
            user: {
              select: {
                name: true,
                username: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!table) {
      return NextResponse.json(
        { error: 'Mesa no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(table)
  } catch (error) {
    console.error('Error al obtener mesa:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar estado o información de mesa
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id } = await params
    const tableId = id

    // Verificar que la mesa existe
    const existingTable = await prisma.table.findUnique({
      where: { id: tableId }
    })

    if (!existingTable) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      )
    }

    // Preparar datos para actualizar
    const updateData: Record<string, unknown> = {}

    // Cambio de estado (permitido para meseros y jefes)
    if (body.status) {
      const validStatuses = ["DISPONIBLE", "OCUPADA", "FUERA_DE_SERVICIO", "ESPERANDO"]
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: "Estado inválido" },
          { status: 400 }
        )
      }
      updateData.status = body.status
    }

    // Cambios en número o capacidad (solo para JEFE)
    if (body.number !== undefined || body.capacity !== undefined) {
      if (session.user.role !== "JEFE") {
        return NextResponse.json(
          { error: "No autorizado para editar configuración de mesa" },
          { status: 401 }
        )
      }

      if (body.number !== undefined) {
        // Verificar que el nuevo número no esté en uso
        const existingWithNumber = await prisma.table.findFirst({
          where: { 
            number: parseInt(body.number),
            isActive: true,
            id: { not: tableId }
          }
        })

        if (existingWithNumber) {
          return NextResponse.json(
            { error: "Ya existe una mesa con ese número" },
            { status: 400 }
          )
        }

        updateData.number = parseInt(body.number)
      }

      if (body.capacity !== undefined) {
        updateData.capacity = parseInt(body.capacity)
      }
    }

    // Actualizar la mesa
    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: updateData
    })

    return NextResponse.json(updatedTable)
  } catch (error) {
    console.error("Error al actualizar mesa:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar mesa
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "JEFE") {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params
    const tableId = id

    // Verificar que la mesa existe
    const existingTable = await prisma.table.findUnique({
      where: { id: tableId }
    })

    if (!existingTable) {
      return NextResponse.json(
        { error: "Mesa no encontrada" },
        { status: 404 }
      )
    }

    // Verificar que no tenga pedidos activos
    const activeOrders = await prisma.order.findMany({
      where: {
        tableId: tableId,
        status: {
          in: ["PENDING", "CONFIRMED"]
        }
      }
    })

    if (activeOrders.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una mesa con pedidos activos" },
        { status: 400 }
      )
    }

    // Verificar si tiene historial de pedidos
    const allOrders = await prisma.order.count({
      where: { tableId: tableId }
    })

    let deletedTable

    if (allOrders > 0) {
      // Si tiene historial, hacer soft delete
      deletedTable = await prisma.table.update({
        where: { id: tableId },
        data: { isActive: false }
      })
    } else {
      // Si no tiene historial, hacer hard delete
      deletedTable = await prisma.table.delete({
        where: { id: tableId }
      })
    }

    return NextResponse.json(deletedTable)
  } catch (error) {
    console.error("Error al eliminar mesa:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}