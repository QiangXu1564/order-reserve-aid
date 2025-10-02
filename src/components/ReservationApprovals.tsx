import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Users, User, Phone, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReservationApproval {
  id: string;
  customer_name: string;
  customer_phone: string;
  reservation_date: string;
  reservation_time: string;
  number_of_people: number;
  status: 'pending' | 'approved' | 'rejected';
  worker_notes: string | null;
  conversation_id: string | null;
  created_at: string;
}

const ReservationApprovals = () => {
  const [approvals, setApprovals] = useState<ReservationApproval[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovals();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('approval-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reservation_approvals'
        },
        (payload) => {
          toast({
            title: "🔔 New reservation request",
            description: `${payload.new.customer_name} wants to reserve for ${payload.new.number_of_people} people`,
          });
          setApprovals(prev => [payload.new as ReservationApproval, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'reservation_approvals'
        },
        (payload) => {
          setApprovals(prev => prev.map(app => 
            app.id === payload.new.id ? payload.new as ReservationApproval : app
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const fetchApprovals = async () => {
    const { data, error } = await supabase
      .from('reservation_approvals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Could not load approval requests",
        variant: "destructive",
      });
    } else if (data) {
      setApprovals(data as ReservationApproval[]);
    }
  };

  const handleApproval = async (id: string, newStatus: 'approved' | 'rejected') => {
    const approval = approvals.find(app => app.id === id);
    if (!approval) return;

    // Update approval status
    const { error: updateError } = await supabase
      .from('reservation_approvals')
      .update({ 
        status: newStatus,
        worker_notes: notes[id] || null,
        responded_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      toast({
        title: "Error",
        description: "Could not update approval",
        variant: "destructive",
      });
      return;
    }

    // If approved, create a reservation
    if (newStatus === 'approved') {
      const reservationDateTime = new Date(`${approval.reservation_date}T${approval.reservation_time}`);
      
      const { error: reservationError } = await supabase
        .from('reservations')
        .insert({
          customer_name: approval.customer_name,
          customer_phone: approval.customer_phone,
          reservation_time: reservationDateTime.toISOString(),
          number_of_people: approval.number_of_people,
          status: 'confirmed'
        });

      if (reservationError) {
        toast({
          title: "Warning",
          description: "Approval updated but failed to create reservation",
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Approval updated",
      description: `Reservation ${newStatus}${newStatus === 'approved' ? ' and added to reservations' : ''}`,
    });
    
    // Remove from list after update
    setApprovals(prev => prev.filter(app => app.id !== id));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Pending Approvals</h2>
        <Badge variant="secondary" className="text-sm">
          {approvals.length} pending
        </Badge>
      </div>

      {approvals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No pending approval requests
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {approvals.map((approval) => (
            <Card key={approval.id} className="hover:shadow-medium transition-smooth border-warning">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">New Request</CardTitle>
                  <Badge className="bg-warning text-warning-foreground">
                    Needs Approval
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span className="font-medium text-foreground">{approval.customer_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{approval.customer_phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{approval.number_of_people} people</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">{formatDate(approval.reservation_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{formatTime(approval.reservation_time)}</span>
                </div>
                
                <div className="pt-2">
                  <Textarea
                    placeholder="Add notes (optional)..."
                    value={notes[approval.id] || ''}
                    onChange={(e) => setNotes(prev => ({ ...prev, [approval.id]: e.target.value }))}
                    className="mb-3 text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproval(approval.id, 'approved')}
                      className="flex-1 bg-success hover:bg-success/90"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleApproval(approval.id, 'rejected')}
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReservationApprovals;
