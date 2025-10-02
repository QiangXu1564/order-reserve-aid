import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  products: any;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
  created_at: string;
}

const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          toast({
            title: "🔔 Nuevo pedido",
            description: `Pedido de ${payload.new.customer_name}`,
          });
          setOrders(prev => [payload.new as Order, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          setOrders(prev => prev.map(order => 
            order.id === payload.new.id ? payload.new as Order : order
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchOrders = async () => {
    // @ts-ignore - Using dynamic table access
    const { data, error } = await supabase
      // @ts-ignore
      .from('orders')
      // @ts-ignore
      .select('*')
      // @ts-ignore
      .in('status', ['pending', 'preparing', 'ready'])
      // @ts-ignore
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los pedidos",
        variant: "destructive",
      });
    } else if (data) {
      setOrders(data);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    // @ts-ignore - Using dynamic table access
    const { error } = await supabase
      // @ts-ignore
      .from('orders')
      // @ts-ignore
      .update({ status: newStatus })
      // @ts-ignore
      .eq('id', orderId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el pedido",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Pedido actualizado",
        description: `Estado cambiado a ${getStatusLabel(newStatus)}`,
      });
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    const labels = {
      pending: "Pendiente",
      preparing: "Preparando",
      ready: "Listo",
      delivered: "Entregado",
    };
    return labels[status];
  };

  const getStatusBadge = (status: Order['status']) => {
    const colorClass = 
      status === 'pending' ? 'bg-warning text-warning-foreground' :
      status === 'preparing' ? 'bg-primary text-primary-foreground' :
      status === 'ready' ? 'bg-success text-success-foreground' :
      'bg-muted text-muted-foreground';

    return (
      <Badge className={colorClass}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProducts = (products: any) => {
    try {
      if (typeof products === 'string') {
        return JSON.parse(products);
      }
      return products;
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Pedidos Activos</h2>
        <Badge variant="secondary" className="text-sm">
          {orders.length} pedidos
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {orders.map((order) => {
          const products = getProducts(order.products);
          return (
            <Card key={order.id} className="hover:shadow-medium transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">#{order.id.slice(0, 8)}</CardTitle>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-foreground">{order.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{order.customer_phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{formatTime(order.created_at)}</span>
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm font-medium mb-2 text-foreground">Productos:</p>
                  <ul className="space-y-1">
                    {Array.isArray(products) && products.map((product: any, index: number) => (
                      <li key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-primary">
                        {typeof product === 'string' ? product : product.name || 'Producto'}
                      </li>
                    ))}
                  </ul>
                </div>

                {order.status === 'pending' && (
                  <div className="flex gap-2 pt-3">
                    <Button
                      size="sm"
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="flex-1"
                    >
                      Preparar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                )}

                {order.status === 'preparing' && (
                  <Button
                    size="sm"
                    onClick={() => updateOrderStatus(order.id, 'ready')}
                    className="w-full"
                  >
                    Marcar como Listo
                  </Button>
                )}

                {order.status === 'ready' && (
                  <Button
                    size="sm"
                    onClick={() => updateOrderStatus(order.id, 'delivered')}
                    className="w-full"
                    variant="secondary"
                  >
                    Marcar como Entregado
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay pedidos activos en este momento</p>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
