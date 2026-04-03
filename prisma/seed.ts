import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Crear usuarios por defecto
  const hashedPasswordJefe = await bcrypt.hash('admin123', 12)
  const hashedPasswordMesero = await bcrypt.hash('mesero123', 12)

  // Crear Jefe
  const jefe = await prisma.user.upsert({
    where: { username: 'jefe' },
    update: {},
    create: {
      username: 'jefe',
      name: 'Jefe del Restaurante',
      password: hashedPasswordJefe,
      role: 'JEFE',
    },
  })

  // Crear Mesero
  const mesero = await prisma.user.upsert({
    where: { username: 'mesero' },
    update: {},
    create: {
      username: 'mesero',
      name: 'Mesero Principal',
      password: hashedPasswordMesero,
      role: 'MESERO',
    },
  })

  // // Crear categorías del menú
  const especialesCarne = await prisma.category.upsert({
   where: { name: 'Especiales de Carne' },
    update: {},
    create: {
    name: 'Especiales de Carne',
    description: 'Platos principales a base de carnes variadas',
  },
})

const agregados = await prisma.category.upsert({
  where: { name: 'Agregados' },
  update: {},
  create: {
    name: 'Agregados',
    description: 'Complementos y guarniciones para tus platos',
  },
})

const bebidasCat = await prisma.category.upsert({
  where: { name: 'Bebidas' },
  update: {},
  create: {
    name: 'Bebidas',
    description: 'Bebidas y refrescos variados',
  },
})

const boxAlitas = await prisma.category.upsert({
  where: { name: 'Box de Alitas' },
  update: {},
  create: {
    name: 'Box de Alitas',
    description: 'Porciones de alitas con acompañamientos',
  },
})

const carta = await prisma.category.upsert({
  where: { name: 'Carta' },
  update: {},
  create: {
    name: 'Carta',
    description: 'Platos variados de la casa',
  },
})

const especialesPollo = await prisma.category.upsert({
  where: { name: 'Especiales de Pollo' },
  update: {},
  create: {
    name: 'Especiales de Pollo',
    description: 'Platos principales a base de pollo',
  },
})

const paraLlevar = await prisma.category.upsert({
  where: { name: 'Para Llevar' },
  update: {},
  create: {
    name: 'Para Llevar',
    description: 'Envases y empaques para llevar',
  },
})
const postres = await prisma.category.upsert({
  where: { name: 'Postres' },
  update: {},
  create: { name: 'Postres' },
})

const jugos = await prisma.category.upsert({
  where: { name: 'Jugos' },
  update: {},
  create: { name: 'Jugos' },
})

const extractos = await prisma.category.upsert({
  where: { name: 'Extractos' },
  update: {},
  create: { name: 'Extractos' },
})

const sandwich = await prisma.category.upsert({
  where: { name: 'Sándwich' },
  update: {},
  create: { name: 'Sándwich' },
})

const cafe = await prisma.category.upsert({
  where: { name: 'Café' },
  update: {},
  create: { name: 'Café' },
})
  // Crear productos de ejemplo
  const productos = [
    // Especiales de Carne
  { name: 'Chaufa de Carne', description: 'Arroz chaufa con carne de res', price: 16.00, categoryId: especialesCarne.id },
  { name: 'Chuleta', description: 'Carne de cerdo, arroz blanco, papas fritas y ensalada', price: 15.00, categoryId: especialesCarne.id },
  { name: 'Churrasco', description: 'Carne densa, arroz blanco, papas fritas y ensalada', price: 17.00, categoryId: especialesCarne.id },
  { name: 'Lomo Saltado', description: 'Tiras de carne salteadas con verduras, papas fritas y arroz', price: 18.00, categoryId: especialesCarne.id },
  { name: 'Lomo Saltado con Chaufa', description: 'Lomo saltado acompañado de arroz chaufa', price: 19.00, categoryId: especialesCarne.id },
  { name: 'Tallarin Saltado de Carne', description: 'Tallarin salteado con carne y verduras', price: 18.00, categoryId: especialesCarne.id },
  { name: 'Bisteck a lo Pobre', description: 'Bisteck con huevo frito, arroz y plátano', price: 20.00, categoryId: especialesCarne.id },

  // Agregados
  { name: 'Huevo', description: 'Huevo frito o sancochado', price: 1.50, categoryId: agregados.id },
  { name: 'Queso', description: 'Porción de queso fresco', price: 2.00, categoryId: agregados.id },
  { name: 'Plátano', description: 'Plátano frito', price: 2.00, categoryId: agregados.id },
  { name: 'Tocino', description: 'Porción de tocino frito', price: 2.50, categoryId: agregados.id },
  { name: 'Hot Dog Clásico', description: 'Hot dog sencillo', price: 2.50, categoryId: agregados.id },
  { name: 'Chorizo', description: 'Porción de chorizo', price: 3.00, categoryId: agregados.id },
  { name: 'Arroz Blanco', description: 'Porción de arroz blanco', price: 3.00, categoryId: agregados.id },
  { name: 'Arroz Chaufa', description: 'Porción de arroz chaufa', price: 5.00, categoryId: agregados.id },
  { name: 'Ensalada', description: 'Ensalada fresca de la casa', price: 3.00, categoryId: agregados.id },
  { name: '1/2 Porción de Papa', description: 'Media porción de papas fritas', price: 6.00, categoryId: agregados.id },
  { name: 'Porción de Papa', description: 'Porción completa de papas fritas', price: 10.00, categoryId: agregados.id },

  // Bebidas 
  { name: 'Agua 750ml', description: 'Agua mineral sin gas', price: 2.50, categoryId: bebidasCat.id },
  { name: 'Vaso de Chicha Morada', description: 'Chicha morada fresca', price: 3.00, categoryId: bebidasCat.id },
  { name: '1/2 L Chicha Morada', description: 'Medio litro de chicha morada', price: 5.00, categoryId: bebidasCat.id },
  { name: '1 L Chicha Morada', description: 'Litro de chicha morada', price: 8.00, categoryId: bebidasCat.id },
  { name: 'Gaseosa Personal', description: 'Gaseosa personal', price: 3.50, categoryId: bebidasCat.id },
  { name: 'Gaseosa 1/2L', description: 'Gaseosa de medio litro', price: 4.00, categoryId: bebidasCat.id },
  { name: 'Gaseosa 1L', description: 'Gaseosa de un litro', price: 6.50, categoryId: bebidasCat.id },
  { name: 'Jumbo', description: 'Gaseosa tamaño jumbo', price: 8.00, categoryId: bebidasCat.id },
  { name: 'Gordita', description: 'Gaseosa botella gordita', price: 4.50, categoryId: bebidasCat.id },
  { name: 'Gaseosa 1.5L', description: 'Gaseosa litro y medio', price: 7.00, categoryId: bebidasCat.id },
  { name: 'Gaseosa 2.1L', description: 'Gaseosa dos litros', price: 8.50, categoryId: bebidasCat.id },
  { name: 'Gaseosa 3L', description: 'Gaseosa tres litros', price: 10.00, categoryId: bebidasCat.id },
  { name: 'Café', description: 'Taza de café', price: 3.00, categoryId: bebidasCat.id },

  // Box de Alitas
  { name: 'Box Personal', description: '5 piezas de alitas + porción de papas + ensalada', price: 15.00, categoryId: boxAlitas.id },
  { name: 'Box Personal con Arroz Blanco', description: '5 piezas de alitas + arroz blanco', price: 17.00, categoryId: boxAlitas.id },
  { name: 'Box Personal con Arroz Chaufa', description: '5 piezas de alitas + arroz chaufa', price: 18.00, categoryId: boxAlitas.id },
  { name: 'Box Mediano', description: '10 piezas de alitas + porción de papas + ensalada', price: 27.00, categoryId: boxAlitas.id },
  { name: 'Box Familiar', description: '15 piezas de alitas + porción de papas + ensalada', price: 40.00, categoryId: boxAlitas.id },
  { name: 'Box Grande', description: '22 piezas de alitas', price: 51.00, categoryId: boxAlitas.id },

  // Carta
  { name: 'Salchipapa', description: 'Hot dog clásico, papas fritas y ensalada', price: 10.00, categoryId: carta.id },
  { name: 'Salchipapa Royal', description: 'Hot dog clásico, huevo, chorizo, papas fritas y ensalada', price: 11.50, categoryId: carta.id },
  { name: 'Choripapa', description: 'Chorizo y papas fritas', price: 12.00, categoryId: carta.id },
  { name: 'Salchimik', description: 'Hot dog clásico, hot dog frank, papas fritas', price: 14.00, categoryId: carta.id },
  { name: 'Salchipollo Especial', description: 'Hot dog clásico, huevo, chorizo, papas fritas y ensalada', price: 16.00, categoryId: carta.id },
  { name: 'Sapichurras', description: 'Pollo empanizado con papas fritas', price: 11.00, categoryId: carta.id },
  { name: 'Pollo Broaster', description: 'Pieza de pollo, arroz chaufa, papas fritas y ensalada', price: 13.00, categoryId: carta.id },
  { name: 'Mostrito Broaster', description: 'Pieza de pollo, arroz chaufa, papas fritas y ensalada', price: 14.00, categoryId: carta.id },

  // Especiales de Pollo
  { name: 'Chaufa de Pollo', description: 'Arroz chaufa con pollo', price: 14.00, categoryId: especialesPollo.id },
  { name: 'Pollo a la Plancha', description: 'Pechuga a la plancha, arroz, papas fritas y ensalada', price: 14.00, categoryId: especialesPollo.id },
  { name: 'Saltado de Pollo', description: 'Pollo salteado con verduras, papas fritas y arroz', price: 15.00, categoryId: especialesPollo.id },
  { name: 'Tallarin Saltado de Pollo', description: 'Tallarin salteado con pollo', price: 15.00, categoryId: especialesPollo.id },
  { name: 'Chicharrón de Pollo', description: 'Trozo de pollo crocante con papas y ensalada', price: 16.00, categoryId: especialesPollo.id },

  // Para Llevar
  { name: 'Envase', description: 'Envase para llevar', price: 1.00, categoryId: paraLlevar.id },
  { name: 'Bolsa', description: 'Bolsa para llevar', price: 0.50, categoryId: paraLlevar.id },

   // Postres
  { name: 'Torta tres leches', description: 'Bizcocho bañado en tres leches', price: 7.5, categoryId: postres.id },
  { name: 'Pay de limón', description: 'Tarta cremosa con base de galleta', price: 7.5, categoryId: postres.id },
  { name: 'Cheesecake de maracuyá', description: 'Cheesecake con coulis de maracuyá', price: 7.5, categoryId: postres.id },
  { name: 'Torta de chocolate', description: 'Bizcocho de cacao con cobertura', price: 7.5, categoryId: postres.id },
  { name: 'Crema volteada', description: 'Flan peruano de vainilla y caramelo', price: 7.5, categoryId: postres.id },
  { name: 'Gelatina', description: 'Gelatina de sabores', price: 2, categoryId: postres.id },
  { name: 'Flan', description: 'Flan tradicional con caramelo', price: 3, categoryId: postres.id },

  // Jugos
  { name: 'Jugo de papaya', description: 'Papaya fresca licuada', price: 4, categoryId: jugos.id },
  { name: 'Jugo de piña', description: 'Piña natural licuada', price: 4, categoryId: jugos.id },
  { name: 'Jugo de manzana', description: 'Manzana fresca licuada', price: 4, categoryId: jugos.id },
  { name: 'Jugo de fresa', description: 'Fresas naturales licuadas', price: 4, categoryId: jugos.id },
  { name: 'Jugo de mango', description: 'Mango maduro licuado', price: 5, categoryId: jugos.id },
  { name: 'Jugo surtido', description: 'Mezcla de frutas de temporada', price: 5, categoryId: jugos.id },
  { name: 'Ponches', description: 'Ponche de frutas (con leche)', price: 7, categoryId: jugos.id },
  { name: 'Fresa con leche', description: 'Fresas licuadas con leche', price: 7, categoryId: jugos.id },
  { name: 'Plátano con leche', description: 'Plátano licuado con leche', price: 9, categoryId: jugos.id },
  { name: 'Arándano con leche', description: 'Arándanos licuados con leche', price: 9, categoryId: jugos.id },

  // Extractos
  { name: 'Extracto verde', description: 'Jugo prensado de verdes y frutas', price: 10, categoryId: extractos.id },
  { name: 'Extracto de zanahoria', description: 'Zanahoria fresca prensada', price: 10, categoryId: extractos.id },
  { name: 'Extracto de beterraga', description: 'Beterraga (remolacha) prensada', price: 10, categoryId: extractos.id },

  // Sándwich
  { name: 'Pan con pollo', description: 'Pollo deshilachado con mayo y lechuga', price: 6, categoryId: sandwich.id },
  { name: 'Pan con chicharrón', description: 'Chicharrón con camote y criolla', price: 8, categoryId: sandwich.id },
  { name: 'Choripán', description: 'Chorizo a la plancha en pan', price: 6, categoryId: sandwich.id },
  { name: 'Hamburguesa clásica', description: 'Carne de res, lechuga, tomate y salsas', price: 8, categoryId: sandwich.id },
  { name: 'Hamburguesa royal', description: 'Hamburguesa con queso y huevo', price: 10, categoryId: sandwich.id },
  { name: 'Triples', description: 'Sándwich triple de jamón, queso y verduras', price: 5, categoryId: sandwich.id },
  { name: 'Empanadas', description: 'Empanadas rellenas (carne o pollo)', price: 4, categoryId: sandwich.id },
  { name: 'Tamales', description: 'Tamales de maíz estilo criollo', price: 5, categoryId: sandwich.id },
  { name: 'Keke', description: 'Bizcocho casero', price: 2.5, categoryId: sandwich.id },

  // Café
  { name: 'Café', description: 'Café pasado caliente', price: 5, categoryId: cafe.id },
  { name: 'Capuchino', description: 'Espresso con leche vaporizada y espuma', price: 8, categoryId: cafe.id },
]

  // Verificar si ya existen productos, si no crearlos
  const existingProducts = await prisma.product.findMany()
  if (existingProducts.length === 0) {
    for (const producto of productos) {
      await prisma.product.create({
        data: producto,
      })
    }
  }

  // Crear mesas por defecto
  const mesas = Array.from({ length: 12 }, (_, i) => ({
    number: i + 1,
    capacity: i < 4 ? 2 : i < 8 ? 4 : 6,
  }))

  for (const mesa of mesas) {
    await prisma.table.upsert({
      where: { number: mesa.number },
      update: {},
      create: mesa,
    })
  }

  // Crear configuración del sistema
  await prisma.systemConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'Mr Frit',
      companyAddress: 'Calle Las Gaviotas 1311, Urb. Los Pinos, Trujillo',
      companyPhone: '+51 997 148 538',
      companyRuc: '10428072265',
      taxRate: 0.18,
      currency: 'S/',
      timezone: 'America/Lima',
    },
  })

  // Crear algunos ingredientes básicos
  const ingredientes = [
    { name: 'Papas', unit: 'kg', currentStock: 50, minStock: 10, cost: 2.50 },
    { name: 'Pollo', unit: 'kg', currentStock: 30, minStock: 5, cost: 8.00 },
    { name: 'Pan de Hamburguesa', unit: 'unidades', currentStock: 100, minStock: 20, cost: 0.50 },
    { name: 'Coca Cola', unit: 'unidades', currentStock: 80, minStock: 15, cost: 2.00 },
    { name: 'Harina', unit: 'kg', currentStock: 25, minStock: 5, cost: 3.00 },
  ]

  for (const ingrediente of ingredientes) {
    await prisma.ingredient.upsert({
      where: { name: ingrediente.name },
      update: {},
      create: ingrediente,
    })
  }

  console.log('✅ Datos iniciales creados exitosamente')
  console.log('👤 Usuario Jefe: jefe / admin123')
  console.log('👤 Usuario Mesero: mesero / mesero123')

  // Crear impresoras por defecto
  console.log('🖨️ Creando impresoras por defecto...')

  // Impresora de cocina principal - LAN
  const existingKitchenPrinter = await prisma.printer.findFirst({
    where: { name: 'Cocina Principal' }
  })

  let kitchenPrinter
  if (!existingKitchenPrinter) {
    kitchenPrinter = await prisma.printer.create({
      data: {
        name: 'Cocina Principal',
        type: 'KITCHEN',
        connectionType: 'NETWORK',
        ipAddress: '192.168.0.100',
        port: 9100,
        paperWidth: 58,
        charactersPerLine: 32,
        timeout: 15000,
        reconnectAttempts: 3,
        reconnectDelay: 2000,
        charset: 'PC437',
        codepage: '437',
        status: 'ACTIVE',
        isDefault: true,
        description: 'Impresora térmica ZJ-8360 para tickets de cocina (LAN)',
        location: 'Área de cocina',
        headerText: 'MR. FRIT - COCINA',
        footerText: 'Preparar con cuidado',
        createdBy: jefe.id
      }
    })
  } else {
    kitchenPrinter = existingKitchenPrinter
  }

  // Impresora de caja - Bluetooth
  const existingCashPrinter = await prisma.printer.findFirst({
    where: { name: 'Caja Principal' }
  })

  let cashPrinter
  if (!existingCashPrinter) {
    cashPrinter = await prisma.printer.create({
      data: {
        name: 'Caja Principal',
        type: 'RECEIPT',
        connectionType: 'BLUETOOTH',
        bluetoothAddress: '00:00:00:00:00:00', // Dirección MAC por defecto, se configurará después
        paperWidth: 58,
        charactersPerLine: 32,
        timeout: 15000,
        reconnectAttempts: 3,
        reconnectDelay: 2000,
        charset: 'PC437',
        codepage: '437',
        status: 'ACTIVE',
        isDefault: true,
        description: 'Impresora térmica Bluetooth para boletas y facturas',
        location: 'Área de caja',
        headerText: 'MR. FRIT',
        footerText: 'Gracias por su preferencia - Vuelva pronto',
        createdBy: jefe.id
      }
    })
  } else {
    cashPrinter = existingCashPrinter
  }

  console.log('🖨️ Impresoras creadas:')
  console.log(`   • ${kitchenPrinter.name} - LAN (${kitchenPrinter.ipAddress}:${kitchenPrinter.port})`)
  console.log(`   • ${cashPrinter.name} - Bluetooth (${cashPrinter.bluetoothAddress})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
