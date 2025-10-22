// Stub file - chat module
// frontend/src/chat.ts - TypeScript version of chat manager

interface ChatMessage {
  id: number;
  user_id: number;
  username: string;
  message: string;
  timestamp: string;
}

export class ChatManager {
  private websocket: WebSocket | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
    this.setupEventListeners();
  }

  private connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/game/ws/chat`;
    
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log('Connected to chat WebSocket');
      this.isConnected = true;
      this.authenticateSocket();
    };

    this.websocket.onmessage = (event: MessageEvent) => {
      this.handleMessage(event);
    };

    this.websocket.onclose = () => {
      console.log('Chat WebSocket connection closed');
      this.isConnected = false;
      // Attempt to reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    };

    this.websocket.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
    };
  }

  private authenticateSocket(): void {
    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    if (!user || !this.websocket) return;

    this.websocket.send(JSON.stringify({
      type: 'userConnect',
      userId: user.userId,
      username: user.username
    }));
  }

  private setupEventListeners(): void {
    // Chat form submission
    document.addEventListener('DOMContentLoaded', () => {
      const chatForm = document.getElementById('chat-form') as HTMLFormElement;
      if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
          e.preventDefault();
          this.sendMessage();
        });
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'connectionAck') {
        console.log('Chat connection acknowledged:', data.message);
        return;
      }
    } catch (e) {
      // Not JSON, treat as regular chat message
    }
    
    this.addChatMessage(event.data);
  }

  private addChatMessage(message: string): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.textContent = message;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  private sendMessage(): void {
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    if (!chatInput || !this.websocket || !this.isConnected) return;

    const authManager = (window as any).authManager;
    const user = authManager?.getCurrentUser();
    const text = chatInput.value.trim();
    
    if (text && user) {
      const chatMsg = `${user.username || 'User'}: ${text}`;
      this.websocket.send(chatMsg);
      chatInput.value = '';
    }
  }

  public disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.isConnected = false;
  }
}

// Global chat manager instance
(window as any).chatManager = new ChatManager();