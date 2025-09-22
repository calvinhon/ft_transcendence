// frontend/js/chat.js
class ChatManager {
    constructor() {
        this.chatSocket = null;
        this.setupChatUI();
        this.connectChatSocket();
    }

    setupChatUI() {
        let chatContainer = document.getElementById('chat-container');
        if (!chatContainer) {
            chatContainer = document.createElement('div');
            chatContainer.id = 'chat-container';
            chatContainer.style.position = 'fixed';
            chatContainer.style.right = '24px';
            chatContainer.style.bottom = '24px';
            chatContainer.style.width = '320px';
            chatContainer.style.background = '#111927cc';
            chatContainer.style.borderRadius = '10px';
            chatContainer.style.boxShadow = '0 2px 12px rgba(0,0,0,.25)';
            chatContainer.style.zIndex = '1000';
            chatContainer.style.padding = '12px';
            chatContainer.style.display = 'none';
            chatContainer.innerHTML = `
                <div id="chat-messages" style="height:180px;overflow-y:auto;background:#222;padding:8px;border-radius:8px;margin-bottom:8px;color:#fff;font-size:15px;"></div>
                <form id="chat-form" style="display:flex;gap:8px;">
                    <input id="chat-input" type="text" placeholder="Type a message..." style="flex:1;padding:8px;border-radius:6px;border:1px solid #333;background:#181c24;color:#fff;" />
                    <button type="submit" class="btn btn-primary" style="padding:8px 16px;">Send</button>
                </form>
            `;
            document.body.appendChild(chatContainer);
        }

        // Show/hide chat based on authentication and game screen
        const showChat = () => {
            const isAuth = window.authManager && window.authManager.isAuthenticated();
            const gameScreen = document.getElementById('game-screen');
            chatContainer.style.display = (isAuth && gameScreen && gameScreen.classList.contains('active')) ? 'block' : 'none';
        };
        showChat();
        document.addEventListener('DOMContentLoaded', showChat);
        document.addEventListener('click', showChat);

        // Handle chat form submit
        const chatForm = document.getElementById('chat-form');
        chatForm.onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const user = window.authManager ? window.authManager.getCurrentUser() : { username: 'User' };
            const text = input.value.trim();
            if (text && this.chatSocket && this.chatSocket.readyState === 1) {
                const chatMsg = `${user.username || 'User'}: ${text}`;
                this.chatSocket.send(chatMsg);
                input.value = '';
            }
        };

        // Add focus/blur handlers to chat input to prevent game control conflicts
        const chatInput = document.getElementById('chat-input');
        chatInput.addEventListener('focus', () => {
            // Clear any game keys when chat is focused
            if (window.gameManager) {
                window.gameManager.keys = {};
            }
        });
        
        chatInput.addEventListener('keydown', (e) => {
            // Prevent game controls from being triggered while typing
            e.stopPropagation();
        });
    }

    connectChatSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const chatUrl = `${protocol}//${window.location.host}/api/game/ws/chat`;
        this.chatSocket = new WebSocket(chatUrl);
        this.chatSocket.onmessage = (event) => {
            this.addChatMessage(event.data);
        };
    }

    addChatMessage(msg) {
        const chatMessages = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.textContent = msg;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

window.chatManager = new ChatManager();
