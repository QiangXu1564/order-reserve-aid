import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, Bot, User } from "lucide-react";
import { Reservation, ChatMessage } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useSSEChat } from "@/hooks/useSSEChat";

interface ReservationChatProps {
  reservation: Reservation;
  onClose: () => void;
}

const ReservationChat = ({ reservation, onClose }: ReservationChatProps) => {
  const { toast } = useToast();
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, isConnected } = useSSEChat(reservation.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const success = await sendMessage(inputMessage);
    if (success) {
      setInputMessage("");
    } else {
      toast({
        title: "Error",
        description: "Could not send message",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col shadow-medium">
        <CardHeader className="border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Chat - {reservation.id}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {reservation.customer} - {reservation.numberOfPeople} people
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          {!isConnected && (
            <div className="mt-2 text-sm text-warning">
              Connecting to the system...
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Chat with the bot is active</p>
              <p className="text-sm">Messages will appear here in real-time</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "bot" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div
                className={`rounded-lg px-4 py-2 max-w-[70%] ${
                  message.sender === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.sender === "user" && (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-accent-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t border-border p-4 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Write your response to the customer..."
              disabled={!isConnected}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || !isConnected}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            The bot will transmit your message to the customer on the call
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ReservationChat;
