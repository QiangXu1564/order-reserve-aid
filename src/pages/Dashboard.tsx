import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut, ChefHat } from "lucide-react";
import OrdersList from "@/components/OrdersList";
import ReservationsList from "@/components/ReservationsList";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check authentication
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50 shadow-medium">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-xl blur-sm opacity-75"></div>
                <div className="relative p-3 rounded-xl bg-gradient-primary shadow-medium transform transition-transform hover:scale-105">
                  <ChefHat className="w-7 h-7 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Panel de Control
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5 font-medium">
                  Gestión de pedidos y reservas en tiempo real
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="gap-2 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-all duration-300 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 mb-10 h-14 p-1.5 bg-muted/50 backdrop-blur-sm shadow-soft">
            <TabsTrigger 
              value="orders" 
              className="text-base font-semibold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-medium transition-all duration-300 rounded-lg"
            >
              📦 Pedidos
            </TabsTrigger>
            <TabsTrigger 
              value="reservations" 
              className="text-base font-semibold data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-medium transition-all duration-300 rounded-lg"
            >
              🍽️ Reservas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-0 animate-in fade-in-50 duration-300">
            <OrdersList />
          </TabsContent>

          <TabsContent value="reservations" className="mt-0 animate-in fade-in-50 duration-300">
            <ReservationsList />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
