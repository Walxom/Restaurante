import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket, useOrdersSocket } from '@/hooks/useSocket';

export interface DashboardStats {
  mesas: {
    DISPONIBLE: number;
    OCUPADA: number;
    ESPERANDO: number;
    MANTENIMIENTO: number;
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

  const ordersSocketInstance = ordersSocket?.socket;
  useEffect(() => {
    if (ordersSocketInstance) {
      setOrdersConnected(ordersSocketInstance.connected);
      const onConnect = () => setOrdersConnected(true);
      const onDisconnect = () => setOrdersConnected(false);

      ordersSocketInstance.on('connect', onConnect);
      ordersSocketInstance.on('disconnect', onDisconnect);
      return () => {
        ordersSocketInstance.off('connect', onConnect);
        ordersSocketInstance.off('disconnect', onDisconnect);
      };
    }
  }, [ordersSocketInstance]);

  const tablesSocketInstance = tablesSocket?.socket;
  useEffect(() => {
    if (tablesSocketInstance) {
      setTablesConnected(tablesSocketInstance.connected);
      const onConnect = () => setTablesConnected(true);
      const onDisconnect = () => setTablesConnected(false);
      
      const onTableChange = () => {
        setTimeout(() => fetchAllData(), 100);
      };

      tablesSocketInstance.on('connect', onConnect);
      tablesSocketInstance.on('disconnect', onDisconnect);
      tablesSocketInstance.on('table_updated', onTableChange);
      tablesSocketInstance.on('table_status_changed', onTableChange);

      return () => {
        tablesSocketInstance.off('connect', onConnect);
        tablesSocketInstance.off('disconnect', onDisconnect);
        tablesSocketInstance.off('table_updated', onTableChange);
        tablesSocketInstance.off('table_status_changed', onTableChange);
      };
    }
  }, [tablesSocketInstance, fetchAllData]);

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
    if (stats.mesas.MANTENIMIENTO && stats.mesas.MANTENIMIENTO > 0) count++;
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
