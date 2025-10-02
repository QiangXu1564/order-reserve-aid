import { useState, useEffect, useRef } from "react";
import { ChatMessage, SSEMessage } from "@/types";

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/leaping-ai-proxy`;

export const useSSEChat = (reservationId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const connectSSE = async () => {
      try {
        const response = await fetch(PROXY_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reservationId,
            action: "connect"
          }),
        });

        if (!response.ok) {
          throw new Error(`Error de conexión: ${response.status}`);
        }

        setIsConnected(true);
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No se pudo obtener el reader");

        // Leer el stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data.trim() === "[DONE]") {
                console.log("Stream finalizado");
                setIsConnected(false);
                break;
              }

              try {
                const message: SSEMessage = JSON.parse(data);
                
                if (message.type === "chat_message" && message.sender === "bot" && message.content) {
                  const newMessage: ChatMessage = {
                    id: Date.now().toString(),
                    sender: "bot",
                    content: message.content,
                    timestamp: new Date().toISOString(),
                  };
                  setMessages((prev) => [...prev, newMessage]);
                }

                if (message.type === "end") {
                  console.log("Chat finalizado por el bot");
                  // Aquí puedes llamar a tu API para guardar los resultados
                  // POST /api/reservas/${reservationId}/confirmar
                }
              } catch (e) {
                console.error("Error parseando mensaje SSE:", e);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error en conexión SSE:", error);
        setIsConnected(false);
      }
    };

    connectSSE();

    return () => {
      setIsConnected(false);
    };
  }, [reservationId]);

  const sendMessage = async (content: string): Promise<boolean> => {
    try {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reservationId,
          action: "send",
          content,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar mensaje");
      }

      // Agregar el mensaje del usuario a la lista
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: "user",
        content,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      return true;
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      return false;
    }
  };

  return {
    messages,
    sendMessage,
    isConnected,
  };
};
