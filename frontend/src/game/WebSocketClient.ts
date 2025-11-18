// WebSocket client module - handles game server connections and messaging

export interface WebSocketConfig {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  onMessage?: (data: any) => void;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 2000;
  
  constructor(config: WebSocketConfig) {
    this.config = config;
  }
  
  public connect(url: string): void {
    console.log('🔌 [WS] Connecting to:', url);
    
    try {
      this.ws = new WebSocket(url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ [WS] Connection error:', error);
      if (this.config.onError) {
        this.config.onError(new Event('error'));
      }
    }
  }
  
  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onopen = (event: Event) => {
      console.log('✅ [WS] Connected successfully');
      this.reconnectAttempts = 0;
      if (this.config.onOpen) {
        this.config.onOpen(event);
      }
    };
    
    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 [WS] Message received:', data.type);
        if (this.config.onMessage) {
          this.config.onMessage(data);
        }
      } catch (error) {
        console.error('❌ [WS] Error parsing message:', error);
      }
    };
    
    this.ws.onerror = (event: Event) => {
      console.error('❌ [WS] WebSocket error:', event);
      if (this.config.onError) {
        this.config.onError(event);
      }
    };
    
    this.ws.onclose = (event: CloseEvent) => {
      console.log('🔌 [WS] Connection closed:', event.code, event.reason);
      if (this.config.onClose) {
        this.config.onClose(event);
      }
      
      // Attempt reconnection if not a clean close and under max attempts
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };
  }
  
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`🔄 [WS] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      if (this.ws && this.ws.url) {
        this.connect(this.ws.url);
      }
    }, this.reconnectDelay);
  }
  
  public send(message: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ [WS] Cannot send message - WebSocket not connected');
      return false;
    }
    
    try {
      const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(messageStr);
      console.log('📤 [WS] Message sent:', message.type || 'unknown');
      return true;
    } catch (error) {
      console.error('❌ [WS] Error sending message:', error);
      return false;
    }
  }
  
  public close(code?: number, reason?: string): void {
    if (this.ws) {
      console.log('🔌 [WS] Closing connection');
      this.ws.close(code, reason);
      this.ws = null;
    }
  }
  
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
  
  public getReadyState(): number | null {
    return this.ws ? this.ws.readyState : null;
  }
  
  public getWebSocket(): WebSocket | null {
    return this.ws;
  }
}
