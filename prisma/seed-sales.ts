/**
 * Datos de demostración: genera un año de pedidos con estacionalidad semanal y horaria
 * para que el pronóstico de demanda y la venta cruzada tengan historial.
 *
 *   pnpm db:seed:demo
 *
 * Borra todos los pedidos existentes. Solo para demostraciones y pruebas, nunca en producción.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Clientes simulados para órdenes de delivery/para llevar
const clientes = [
  { name: 'Juan Perez', dni: '45896321', phone: '985471236' },
  { name: 'Maria Rodriguez', dni: '70258963', phone: '945632147' },
  { name: 'Carlos Mendoza', dni: '10458963', phone: '963258741' },
  { name: 'Ana Gomez', dni: '44521896', phone: '951236478' },
  { name: 'Luis Castro', dni: '08547896', phone: '996325874' },
  { name: 'Diana Lopez', dni: '74125896', phone: '987412356' },
  { name: 'Roberto Sanchez', dni: '41258963', phone: '993214587' },
  { name: 'Patricia Ortiz', dni: '09587412', phone: '941258963' }
]

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:seed:demo borra todos los pedidos y no se ejecuta con NODE_ENV=production.')
  }
  console.log('🧹 Limpiando historial de pedidos y ventas anteriores...')
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()

  console.log('👥 Obteniendo usuarios, productos y mesas disponibles...')
  
  const jefe = await prisma.user.findUnique({ where: { username: 'jefe' } })
  const mesero = await prisma.user.findUnique({ where: { username: 'mesero' } })

  if (!jefe || !mesero) {
    throw new Error('❌ Debes ejecutar primero el seed básico (pnpm db:seed) para crear los usuarios jefe y mesero.')
  }

  const allProducts = await prisma.product.findMany({
    include: { category: true }
  })
  
  if (allProducts.length === 0) {
    throw new Error('❌ No se encontraron productos en la base de datos. Ejecuta primero pnpm db:seed.')
  }

  const mesas = await prisma.table.findMany()

  // Agrupar productos por categorías semánticas
  const platosCarne = allProducts.filter(p => p.category.name === 'Especiales de Carne')
  const platosPollo = allProducts.filter(p => p.category.name === 'Especiales de Pollo')
  const alitas = allProducts.filter(p => p.category.name === 'Box de Alitas')
  const cartaSalchipapas = allProducts.filter(p => p.category.name === 'Carta')
  const bebidas = allProducts.filter(p => p.category.name === 'Bebidas')
  const agregados = allProducts.filter(p => p.category.name === 'Agregados')
  const empaques = allProducts.filter(p => p.category.name === 'Para Llevar')
  const snacksPostres = allProducts.filter(p => 
    ['Postres', 'Jugos', 'Extractos', 'Sándwich', 'Café'].includes(p.category.name)
  )

  console.log('📊 Productos clasificados semánticamente:')
  console.log(`   • Especiales Carne: ${platosCarne.length}`)
  console.log(`   • Especiales Pollo: ${platosPollo.length}`)
  console.log(`   • Box de Alitas: ${alitas.length}`)
  console.log(`   • Carta/Fast Food: ${cartaSalchipapas.length}`)
  console.log(`   • Bebidas: ${bebidas.length}`)
  console.log(`   • Empaques (Llevar): ${empaques.length}`)
  console.log(`   • Snacks/Postres: ${snacksPostres.length}`)

  console.log('🚀 Iniciando simulación de alto realismo de 365 días...')

  const now = new Date()
  const startDate = new Date()
  startDate.setDate(now.getDate() - 365) // 1 año atrás

  const dateCursor = new Date(startDate)
  let orderGlobalIndex = 1

  // 1. Fase de Planificación Cronológica
  console.log('📅 Planificando fechas y estacionalidades de ventas...')
  const plannedOrders: Array<{
    date: Date
    mealType: 'almuerzo' | 'cena' | 'tarde'
    isWeekend: boolean
  }> = []

  while (dateCursor <= now) {
    const dayOfWeek = dateCursor.getDay() // 0 = Domingo, 5 = Viernes, 6 = Sábado
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6

    // Estacionalidad Semanal (Fin de semana vs. laborable)
    // Fin de semana: 6 a 12 pedidos (Reducimos un poco el rango para mantener excelente rendimiento en SQLite)
    // Laborable: 2 a 4 pedidos
    const ordersTodayCount = isWeekend 
      ? 6 + Math.floor(Math.random() * 7) 
      : 2 + Math.floor(Math.random() * 3)

    for (let o = 0; o < ordersTodayCount; o++) {
      const orderDate = new Date(dateCursor)
      
      // Estacionalidad Horaria (Picos de Almuerzo y Cena)
      const hourRoll = Math.random()
      let mealType: 'almuerzo' | 'cena' | 'tarde' = 'cena'
      let hour = 19
      
      if (hourRoll < 0.35) {
        mealType = 'almuerzo'
        hour = 12 + Math.floor(Math.random() * 3) // 12 PM - 3 PM
      } else if (hourRoll < 0.90) {
        mealType = 'cena'
        hour = 19 + Math.floor(Math.random() * 3) // 7 PM - 10 PM
      } else {
        mealType = 'tarde'
        hour = 16 + Math.floor(Math.random() * 2) // 4 PM - 6 PM
      }

      const minutes = Math.floor(Math.random() * 60)
      orderDate.setHours(hour, minutes, 0, 0)

      plannedOrders.push({
        date: orderDate,
        mealType,
        isWeekend
      })
    }

    dateCursor.setDate(dateCursor.getDate() + 1)
  }

  // Ordenar de forma ascendente por tiempo
  plannedOrders.sort((a, b) => a.date.getTime() - b.date.getTime())

  console.log(`📦 Planificados ${plannedOrders.length} pedidos en total.`)
  console.log('💾 Guardando pedidos secuencialmente en SQLite (100% libre de bloqueos)...')

  let ordersCreatedCount = 0
  let itemsCreatedCount = 0

  // Bucle puramente secuencial para garantizar que SQLite jamás reciba escrituras paralelas
  for (let idx = 0; idx < plannedOrders.length; idx++) {
    const plan = plannedOrders[idx]
    const orderNum = `O-${10000 + orderGlobalIndex}`
    orderGlobalIndex++

    // 93% Completado, 7% Cancelado
    const isCancelled = Math.random() < 0.07
    const status = isCancelled ? 'CANCELLED' : 'COMPLETED'

    // Tipo de orden: 70% Mesa, 30% Llevar
    const isTableOrder = Math.random() < 0.70
    const table = isTableOrder && mesas.length > 0 ? mesas[Math.floor(Math.random() * mesas.length)] : null
    const orderType = table ? 'MESA' : 'LLEVAR'

    const user = Math.random() < 0.75 ? mesero : jefe
    const client = !table && Math.random() < 0.50 ? clientes[Math.floor(Math.random() * clientes.length)] : null

    // 1. Crear Orden base
    const order = await prisma.order.create({
      data: {
        orderNumber: orderNum,
        type: orderType,
        status: status,
        tableId: table?.id || null,
        userId: user.id,
        customerName: client?.name || null,
        customerDni: client?.dni || null,
        customerPhone: client?.phone || null,
        createdAt: plan.date,
        updatedAt: plan.date
      }
    })

    ordersCreatedCount++
    let orderTotal = 0
    const selectedProductsForOrder: Array<{ product: typeof allProducts[0]; qty: number }> = []

    // 2. Selección Semántica de Platos
    if (plan.mealType === 'almuerzo') {
      const pool = [...platosCarne, ...platosPollo]
      if (pool.length > 0) {
        const qty = 1 + Math.floor(Math.random() * 2)
        const prod = pool[Math.floor(Math.random() * pool.length)]
        selectedProductsForOrder.push({ product: prod, qty })
      }
    } else if (plan.mealType === 'cena') {
      const pool = [...alitas, ...cartaSalchipapas]
      if (pool.length > 0) {
        const qty = 1 + Math.floor(Math.random() * 2)
        const prod = pool[Math.floor(Math.random() * pool.length)]
        selectedProductsForOrder.push({ product: prod, qty })
      }
    } else {
      if (snacksPostres.length > 0) {
        const qty = 1 + Math.floor(Math.random() * 2)
        const prod = snacksPostres[Math.floor(Math.random() * snacksPostres.length)]
        selectedProductsForOrder.push({ product: prod, qty })
      }
    }

    // Posibilidad de agregar un segundo plato principal diferente (35% de probabilidad)
    if (Math.random() < 0.35) {
      const pool = plan.mealType === 'almuerzo' ? platosPollo : (plan.mealType === 'cena' ? cartaSalchipapas : snacksPostres)
      if (pool.length > 0) {
        const prod = pool[Math.floor(Math.random() * pool.length)]
        if (!selectedProductsForOrder.find(item => item.product.id === prod.id)) {
          selectedProductsForOrder.push({ product: prod, qty: 1 })
        }
      }
    }

    // 3. Agregar Bebidas Coherentes (85% de probabilidad)
    if (Math.random() < 0.85 && bebidas.length > 0) {
      const totalItemsQty = selectedProductsForOrder.reduce((sum, item) => sum + item.qty, 0)
      
      if (totalItemsQty > 2) {
        const poolGrandes = bebidas.filter(b => b.name.includes('1.5L') || b.name.includes('1 L') || b.name.includes('3L'))
        const prodBebida = poolGrandes.length > 0 
          ? poolGrandes[Math.floor(Math.random() * poolGrandes.length)]
          : bebidas[Math.floor(Math.random() * bebidas.length)]
        selectedProductsForOrder.push({ product: prodBebida, qty: 1 })
      } else {
        const poolPersonales = bebidas.filter(b => b.name.includes('Vaso') || b.name.includes('Personal') || b.name.includes('1/2L'))
        const prodBebida = poolPersonales.length > 0 
          ? poolPersonales[Math.floor(Math.random() * poolPersonales.length)]
          : bebidas[Math.floor(Math.random() * bebidas.length)]
        selectedProductsForOrder.push({ product: prodBebida, qty: totalItemsQty })
      }
    }

    // 4. Agregar Envases y Bolsas si es para llevar (90% de probabilidad)
    if (orderType === 'LLEVAR' && empaques.length > 0 && Math.random() < 0.90) {
      const envase = empaques.find(e => e.name === 'Envase')
      const bolsa = empaques.find(e => e.name === 'Bolsa')
      
      if (envase) selectedProductsForOrder.push({ product: envase, qty: 1 })
      if (bolsa) selectedProductsForOrder.push({ product: bolsa, qty: 1 })
    }

    // 5. Inserción física de los ítems para este pedido
    for (const item of selectedProductsForOrder) {
      const price = Number(item.product.price)
      const subtotal = price * item.qty
      orderTotal += subtotal

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.product.id,
          quantity: item.qty,
          unitPrice: price,
          subtotal: subtotal,
          status: status === 'CANCELLED' ? 'CANCELLED' : 'SERVED',
          createdAt: plan.date,
          updatedAt: plan.date
        }
      })
      itemsCreatedCount++
    }

    // 6. Actualizar monto final sumado de la orden
    await prisma.order.update({
      where: { id: order.id },
      data: { totalAmount: orderTotal }
    })

    // Feedback cada 200 pedidos
    if (ordersCreatedCount % 200 === 0 || ordersCreatedCount === plannedOrders.length) {
      console.log(`   • [Progreso] Creados y sincronizados ${ordersCreatedCount} de ${plannedOrders.length} pedidos diarios...`)
    }
  }

  console.log('\n🌟 ¡SIMULACIÓN AVANZADA DIARIA COMPLETADA CON ÉXITO!')
  console.log(`   • Historial de Días Cubiertos: 365 días (todos sin vacíos)`)
  console.log(`   • Total de Pedidos en Sistema: ${ordersCreatedCount}`)
  console.log(`   • Total de Ítems Vendidos: ${itemsCreatedCount}`)
  console.log(' 💡 Secciones como "Semana" y "Hoy" ahora mostrarán estacionalidades ultra realistas.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el Seeding Avanzado:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
