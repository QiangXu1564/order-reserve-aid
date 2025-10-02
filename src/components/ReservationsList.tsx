import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Users, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Reservation {
  id: string;
  customer_name: string;
  customer_phone: string;
  number_of_people: number;
  reservation_time: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  created_at: string;
}

const ReservationsList = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchReservations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          toast({
            title: "🔔 Nueva reserva",
            description: `Reserva de ${payload.new.customer_name}`,
          });
          setReservations(prev => [payload.new as Reservation, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservations'
        },
        (payload) => {
          setReservations(prev => prev.map(res => 
            res.id === payload.new.id ? payload.new as Reservation : res
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchReservations = async () => {
    // @ts-ignore - Using dynamic table access
    const { data, error } = await supabase
      // @ts-ignore
      .from('reservations')
      // @ts-ignore
      .select('*')
      // @ts-ignore
      .in('status', ['pending', 'confirmed'])
      // @ts-ignore
      .order('reservation_time', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las reservas",
        variant: "destructive",
      });
    } else if (data) {
      setReservations(data);
    }
  };

  const updateReservationStatus = async (reservationId: string, newStatus: Reservation['status']) => {
    // @ts-ignore - Using dynamic table access
    const { error } = await supabase
      // @ts-ignore
      .from('reservations')
      // @ts-ignore
      .update({ status: newStatus })
      // @ts-ignore
      .eq('id', reservationId);

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la reserva",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reserva actualizada",
        description: `Estado cambiado a ${getStatusLabel(newStatus)}`,
      });
    }
  };

  const getStatusLabel = (status: Reservation['status']) => {
    const labels = {
      pending: "Pendiente",
      confirmed: "Confirmada",
      rejected: "Rechazada",
      completed: "Completada",
    };
    return labels[status];
  };

  const getStatusBadge = (status: Reservation['status']) => {
    const colorClass = 
      status === 'pending' ? 'bg-warning text-warning-foreground' :
      status === 'confirmed' ? 'bg-success text-success-foreground' :
      status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
      'bg-muted text-muted-foreground';

    return (
      <Badge className={colorClass}>
        {getStatusLabel(status)}
      </Badge>
    );
  };

  const formatDateTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Reservas</h2>
        <Badge variant="secondary" className="text-sm">
          {reservations.length} reservas
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reservations.map((reservation) => (
          <Card key={reservation.id} className="hover:shadow-medium transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">#{reservation.id.slice(0, 8)}</CardTitle>
                {getStatusBadge(reservation.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="font-medium text-foreground">{reservation.customer_name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{reservation.customer_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm">{reservation.number_of_people} personas</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatDateTime(reservation.reservation_time)}</span>
              </div>
              
              {reservation.status === 'pending' && (
                <div className="flex gap-2 pt-3">
                  <Button
                    size="sm"
                    onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                    className="flex-1"
                  >
                    Aceptar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateReservationStatus(reservation.id, 'rejected')}
                    className="flex-1"
                  >
                    Rechazar
                  </Button>
                </div>
              )}

              {reservation.status === 'confirmed' && (
                <Button
                  size="sm"
                  onClick={() => updateReservationStatus(reservation.id, 'completed')}
                  className="w-full"
                  variant="secondary"
                >
                  Marcar como Completada
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {reservations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No hay reservas activas en este momento</p>
        </div>
      )}
    </div>
  );
};

export default ReservationsList;
