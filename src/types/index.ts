export interface Order {
  id: string;
  customer: string;
  dishes: string[];
  time: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivered';
}

export interface Reservation {
  id: string;
  customer: string;
  numberOfPeople: number;
  dateTime: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  chatActive?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: string;
}

export interface SSEMessage {
  type: 'chat_message' | 'end';
  sender?: 'user' | 'bot';
  content?: string;
}
