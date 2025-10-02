import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reservation } from "@/types";
import { Calendar, Users, MessageSquare } from "lucide-react";
import ReservationChat from "./ReservationChat";

const ReservationsList = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    // Mock data - reemplazar con llamada a tu API: GET /api/reservas
    const mockReservations: Reservation[] = [
      {
        id: "RES-001",
        customer: "Ana Martínez",
        numberOfPeople: 4,
        dateTime: "2025-10-03 20:00",
        status: "pending",
        chatActive: true,
      },
      {
        id: "RES-002",
        customer: "Pedro Sánchez",
        numberOfPeople: 2,
        dateTime: "2025-10-03 21:30",
        status: "confirmed",
      },
      {
        id: "RES-003",
        customer: "Laura Fernández",
        numberOfPeople: 6,
        dateTime: "2025-10-04 19:00",
        status: "pending",
      },
    ];
    setReservations(mockReservations);
  }, []);

  const getStatusBadge = (status: Reservation['status']) => {
    const statusConfig = {
      pending: { label: "Pendiente", color: "bg-warning text-warning-foreground" },
      confirmed: { label: "Confirmada", color: "bg-success text-success-foreground" },
      rejected: { label: "Rechazada", color: "bg-destructive text-destructive-foreground" },
      completed: { label: "Completada", color: "bg-muted text-muted-foreground" },
    };

    const config = statusConfig[status];
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const handleOpenChat = (reservation: Reservation) => {
    setSelectedReservation(reservation);
  };

  const handleCloseChat = () => {
    setSelectedReservation(null);
  };

  return (
    <>
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
                  <CardTitle className="text-lg">{reservation.id}</CardTitle>
                  {getStatusBadge(reservation.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="font-medium text-foreground">{reservation.customer}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{reservation.numberOfPeople} personas</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{reservation.dateTime}</span>
                </div>
                
                {reservation.status === "pending" && (
                  <Button
                    onClick={() => handleOpenChat(reservation)}
                    className="w-full mt-4 bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {reservation.chatActive ? "Ver Chat" : "Abrir Chat"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedReservation && (
        <ReservationChat
          reservation={selectedReservation}
          onClose={handleCloseChat}
        />
      )}
    </>
  );
};

export default ReservationsList;
