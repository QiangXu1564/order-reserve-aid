import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types";
import { Clock, Users } from "lucide-react";

const OrdersList = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Mock data - reemplazar con llamada a tu API: GET /api/pedidos
    const mockOrders: Order[] = [
      {
        id: "ORD-001",
        customer: "Juan Pérez",
        dishes: ["Pizza Margherita", "Pasta Carbonara"],
        time: "12:30",
        status: "preparing",
      },
      {
        id: "ORD-002",
        customer: "María García",
        dishes: ["Hamburguesa Deluxe", "Papas Fritas"],
        time: "12:45",
        status: "pending",
      },
      {
        id: "ORD-003",
        customer: "Carlos López",
        dishes: ["Ensalada César", "Pollo Asado"],
        time: "13:00",
        status: "ready",
      },
    ];
    setOrders(mockOrders);
  }, []);

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig = {
      pending: { label: "Pendiente", variant: "secondary" as const },
      preparing: { label: "Preparando", variant: "default" as const },
      ready: { label: "Listo", variant: "default" as const },
      delivered: { label: "Entregado", variant: "default" as const },
    };

    const config = statusConfig[status];
    const colorClass = 
      status === 'pending' ? 'bg-warning text-warning-foreground' :
      status === 'preparing' ? 'bg-primary text-primary-foreground' :
      status === 'ready' ? 'bg-success text-success-foreground' :
      'bg-muted text-muted-foreground';

    return (
      <Badge variant={config.variant} className={colorClass}>
        {config.label}
      </Badge>
    );
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
        {orders.map((order) => (
          <Card key={order.id} className="hover:shadow-medium transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{order.id}</CardTitle>
                {getStatusBadge(order.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="font-medium text-foreground">{order.customer}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{order.time}</span>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-sm font-medium mb-2 text-foreground">Platos:</p>
                <ul className="space-y-1">
                  {order.dishes.map((dish, index) => (
                    <li key={index} className="text-sm text-muted-foreground pl-2 border-l-2 border-primary">
                      {dish}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OrdersList;
