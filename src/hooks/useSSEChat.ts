import { useState, useEffect, useRef } from "react";
import { ChatMessage, SSEMessage } from "@/types";

// NOTA: Reemplazar estos valores con los reales de tu configuración de Leaping AI
const LEAPING_API_URL = "https://api.leaping.ai/v1/chat/snapshot";
const AGENT_SNAPSHOT_ID = "your_agent_snapshot_id"; // Reemplazar con tu ID real
const BEARER_TOKEN = "your_bearer_token"; // Reemplazar con tu token real

export const useSSEChat = (reservationId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Conectar al SSE de Leaping AI
    const endUserId = `reservation_${reservationId}`;
    const url = `${LEAPING_API_URL}/${AGENT_SNAPSHOT_ID}?end_user_id=${endUserId}`;

    console.log("Conectando a SSE:", url);

    // EventSource no soporta headers personalizados, así que necesitamos usar fetch con ReadableStream
    const connectSSE = async () => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${BEARER_TOKEN}`,
            Accept: "text/event-stream",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Incluir cualquier dato inicial necesario
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
      const endUserId = `reservation_${reservationId}`;
      const url = `${LEAPING_API_URL}/${AGENT_SNAPSHOT_ID}?end_user_id=${endUserId}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "user_message",
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
