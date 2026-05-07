import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket, useOrdersSocket } from './useSocket';

export interface DashboardStats {
  mesas: {
    DISPONIBLE: number;
    OCUPADA: number;
    ESPERANDO: number;
    POR_LIMPIAR?: number;
    FUERA_DE_SERVICIO?: number;
  };
  pedidos: {
    CONFIRMADO: number;
    EN_PREPARACION: number;
    LISTO: number;
    SERVIDO: number;
    CANCELADO: number;
  };
  pedidosPendientes: number;
  pedidosServidos?: number;
  ventasHoy: {
    total: number;
    cantidad: number;
    detalles?: {
      facturas: {
        total: number;
        cantidad: number;
      };
      pedidos: {
        total: number;
        cantidad: number;
      };
    };
  };
  productosActivos: number;
  totalMesas: number;
  stockBajo: number;
  ultimaActualizacion: string;
  activeOrders: number;
  totalSales: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  type: string;
  table?: {
    number: number;
  };
  user: {
    name: string;
  };
}

export const useDashboardStats = () => {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersConnected, setOrdersConnected] = useState(false);
  const [tablesConnected, setTablesConnected] = useState(false);
  const [widgetRefreshTrigger, setWidgetRefreshTrigger] = useState(0);

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Funciones de carga de datos
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/dashboard/stats');

      if (!response.ok) {
        throw new Error('Error al cargar estadísticas');
      }

      const data = await response.json();

      // Obtener pedidos activos para calcular activeOrders y totalSales
      const ordersResponse = await fetch('/api/orders?showAll=true');
      if (ordersResponse.ok) {
        const allOrders = await ordersResponse.json();

        // Filtrar pedidos activos (PENDING, CONFIRMED, SERVED)
        const activeOrders = allOrders.filter((order: Order) =>
          order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'SERVED'
        );

        // Calcular total de ventas activas
        const totalSales = activeOrders.reduce((sum: number, order: Order) => {
          const amount = Number(order.totalAmount) || 0;
          return sum + amount;
        }, 0);

        data.activeOrders = activeOrders.length || 0;
        data.totalSales = totalSales;
      }

      setStats(data);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar las estadísticas del dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  const debouncedFetchData = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate < 2000) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        lastUpdateRef.current = Date.now();
        fetchAllData();
      }, 2000 - timeSinceLastUpdate);
    } else {
      lastUpdateRef.current = now;
      fetchAllData();
    }
  }, [fetchAllData]);

  // Configuración de Sockets
  const ordersSocket = useOrdersSocket({
    onNewOrder: () => {
      debouncedFetchData();
      setWidgetRefreshTrigger(prev => prev + 1);
    },
    onOrderUpdated: () => {
      debouncedFetchData();
      setWidgetRefreshTrigger(prev => prev + 1);
    },
    onOrderStatusChanged: () => {
      debouncedFetchData();
      setWidgetRefreshTrigger(prev => prev + 1);
    }
  });

  const tablesSocket = useSocket({
    autoConnect: true,
    room: 'tables'
  });

  useEffect(() => {
    if (ordersSocket?.socket) {
      setOrdersConnected(ordersSocket.socket.connected);
      ordersSocket.socket.on('connect', () => setOrdersConnected(true));
      ordersSocket.socket.on('disconnect', () => setOrdersConnected(false));
      return () => {
        ordersSocket.socket?.off('connect');
        ordersSocket.socket?.off('disconnect');
      };
    }
  }, [ordersSocket]);

  useEffect(() => {
    if (tablesSocket?.socket) {
      setTablesConnected(tablesSocket.socket.connected);
      tablesSocket.socket.on('connect', () => setTablesConnected(true));
      tablesSocket.socket.on('disconnect', () => setTablesConnected(false));
      
      tablesSocket.socket.on('table_updated', () => {
        setTimeout(() => fetchAllData(), 100);
      });

      tablesSocket.socket.on('table_status_changed', () => {
        setTimeout(() => fetchAllData(), 100);
      });

      return () => {
        tablesSocket.socket?.off('connect');
        tablesSocket.socket?.off('disconnect');
        tablesSocket.socket?.off('table_updated');
        tablesSocket.socket?.off('table_status_changed');
      };
    }
  }, [tablesSocket, fetchAllData]);

  // Intervalo de actualización
  useEffect(() => {
    if (session?.user?.role === 'JEFE') {
      fetchAllData();
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [session, fetchAllData]);

  // Alertas
  const getAlertsCount = useCallback((): number => {
    if (!stats) return 0;
    let count = 0;
    if (stats.stockBajo > 0) count++;
    if (stats.pedidosPendientes > 5) count++;
    if (stats.mesas.POR_LIMPIAR && stats.mesas.POR_LIMPIAR > 0) count++;
    if (stats.mesas.FUERA_DE_SERVICIO && stats.mesas.FUERA_DE_SERVICIO > 0) count++;
    return count;
  }, [stats]);

  return {
    stats,
    loading,
    error,
    ordersConnected,
    tablesConnected,
    widgetRefreshTrigger,
    fetchStats,
    getAlertsCount
  };
};
