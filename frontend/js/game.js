// frontend/js/game.js
class GameManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.websocket = null;
        this.gameState = null;
        this.isPlaying = false;
        this.keys = {};
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Find match button
        document.getElementById('find-match-btn').addEventListener('click', () => {
            this.findMatch();
        });
    }

    async findMatch() {
        // Check if user is logged in before attempting to find match
        const user = window.authManager.getCurrentUser();
        if (!user || !user.userId) {
            alert('You must be logged in to play. Redirecting to login page.');
            // Redirect to login page
            document.getElementById('game-screen').classList.remove('active');
            document.getElementById('login-screen').classList.add('active');
            return;
        }
        
        const findBtn = document.getElementById('find-match-btn');
        const waitingMsg = document.getElementById('waiting-message');
        
        findBtn.disabled = true;
        findBtn.textContent = 'Finding...';
        waitingMsg.classList.remove('hidden');

        try {
            await this.connectToGameServer();
        } catch (error) {
            console.error('Failed to connect to game server:', error);
            this.resetFindMatch();
        }
    }

    async connectToGameServer() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/game/ws`;
        
        this.websocket = new WebSocket(wsUrl);

        this.websocket.onopen = () => {
            console.log('Connected to game server');
            const user = window.authManager.getCurrentUser();
            console.log('Current user:', user);
            if (!user || !user.userId) {
                console.error('No valid user logged in!');
                alert('You must be logged in to play. Redirecting to login page.');
                this.resetFindMatch();
                // Redirect to login page
                document.getElementById('game-screen').classList.remove('active');
                document.getElementById('login-screen').classList.add('active');
                return;
            }
            console.log('Sending joinGame message:', {
                type: 'joinGame',
                userId: user.userId,
                username: user.username
            });
            this.websocket.send(JSON.stringify({
                type: 'joinGame',
                userId: user.userId,
                username: user.username
            }));
        };

        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleGameMessage(data);
        };

        this.websocket.onclose = () => {
            console.log('Disconnected from game server');
            this.resetFindMatch();
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.resetFindMatch();
        };
    }

    handleGameMessage(data) {
        switch (data.type) {
            case 'waiting':
                // Already handled by UI
                break;
            
            case 'gameStart':
                this.startGame(data);
                break;
            
            case 'gameState':
                this.updateGameState(data);
                break;
            
            case 'gameEnd':
                this.endGame(data);
                break;
        }
    }

    startGame(data) {
        console.log('Game started:', data);
        // Hide waiting UI and show game canvas
        document.getElementById('game-status').classList.add('hidden');
        document.getElementById('game-canvas-container').classList.remove('hidden');
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.isPlaying = true;
        // Show stop button
        let stopBtn = document.getElementById('stop-game-btn');
        if (!stopBtn) {
            stopBtn = document.createElement('button');
            stopBtn.id = 'stop-game-btn';
            stopBtn.className = 'btn btn-danger';
            stopBtn.textContent = 'Stop Game';
            stopBtn.style.margin = '16px auto';
            stopBtn.onclick = () => this.haltGame();
            document.getElementById('game-canvas-container').appendChild(stopBtn);
        } else {
            stopBtn.style.display = 'block';
        }
        // Start input handling
        this.startInputLoop();
    }

    updateGameState(data) {
        this.gameState = data;
        this.render();
        
        // Update scores
        document.getElementById('player1-score').textContent = data.scores.player1;
        document.getElementById('player2-score').textContent = data.scores.player2;
    }

    render() {
        if (!this.ctx || !this.gameState) return;

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, 800, 600);

        // Draw center line
        this.ctx.strokeStyle = '#fff';
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(400, 0);
        this.ctx.lineTo(400, 600);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw paddles
        this.ctx.fillStyle = '#00d4ff';
        this.ctx.fillRect(
            this.gameState.paddles.player1.x, 
            this.gameState.paddles.player1.y, 
            10, 100
        );
        this.ctx.fillRect(
            this.gameState.paddles.player2.x, 
            this.gameState.paddles.player2.y, 
            10, 100
        );

        // Draw ball
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.gameState.ball.x, this.gameState.ball.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Add glow effect to ball
        this.ctx.shadowColor = '#fff';
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(this.gameState.ball.x, this.gameState.ball.y, 8, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    startInputLoop() {
        const inputInterval = setInterval(() => {
            if (!this.isPlaying || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                clearInterval(inputInterval);
                return;
            }

            // Send paddle movement
            if (this.keys['w'] || this.keys['arrowup']) {
                this.websocket.send(JSON.stringify({
                    type: 'movePaddle',
                    direction: 'up'
                }));
            }
            
            if (this.keys['s'] || this.keys['arrowdown']) {
                this.websocket.send(JSON.stringify({
                    type: 'movePaddle',
                    direction: 'down'
                }));
            }
        }, 1000 / 60); // 60 FPS input
    }

    endGame(data) {
        console.log('Game ended:', data);
        this.isPlaying = false;
        const user = window.authManager.getCurrentUser();
        const isWinner = data.winner === user.userId;
        // Show game result
        alert(isWinner ? 'You won!' : 'You lost!');
        this.resetGame();
    }

    haltGame() {
        this.isPlaying = false;
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        // Hide stop button
        const stopBtn = document.getElementById('stop-game-btn');
        if (stopBtn) stopBtn.style.display = 'none';
        // Reset UI
        document.getElementById('game-status').classList.remove('hidden');
        document.getElementById('game-canvas-container').classList.add('hidden');
        this.resetFindMatch();
    }

    resetGame() {
        this.isPlaying = false;
        
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        // Reset UI
        document.getElementById('game-status').classList.remove('hidden');
        document.getElementById('game-canvas-container').classList.add('hidden');
        this.resetFindMatch();
    }

    resetFindMatch() {
        const findBtn = document.getElementById('find-match-btn');
        const waitingMsg = document.getElementById('waiting-message');
        
        findBtn.disabled = false;
        findBtn.textContent = 'Find Match';
        waitingMsg.classList.add('hidden');
    }

    async loadGameHistory(userId) {
        try {
            const response = await fetch(`/api/game/history/${userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const games = await response.json();
                this.displayGameHistory(games);
            }
        } catch (error) {
            console.error('Failed to load game history:', error);
        }
    }

    displayGameHistory(games) {
        const historyContainer = document.getElementById('game-history');
        
        if (games.length === 0) {
            historyContainer.innerHTML = '<p>No games played yet.</p>';
            return;
        }

        const historyHTML = games.map(game => {
            const user = window.authManager.getCurrentUser();
            const isPlayer1 = game.player1_id === user.userId;
            const opponentName = isPlayer1 ? game.player2_name : game.player1_name;
            const userScore = isPlayer1 ? game.player1_score : game.player2_score;
            const opponentScore = isPlayer1 ? game.player2_score : game.player1_score;
            const won = game.winner_id === user.userId;

            return `
                <div class="history-item ${won ? 'win' : 'loss'}">
                    <div class="match-info">
                        <span class="opponent">vs ${opponentName}</span>
                        <span class="score">${userScore} - ${opponentScore}</span>
                        <span class="result ${won ? 'win' : 'loss'}">${won ? 'WIN' : 'LOSS'}</span>
                    </div>
                    <div class="match-date">${new Date(game.started_at).toLocaleDateString()}</div>
                </div>
            `;
        }).join('');

        historyContainer.innerHTML = historyHTML;
    }

    async loadGameStats(userId) {
        try {
            const response = await fetch(`/api/game/stats/${userId}`, {
                headers: window.authManager.getAuthHeaders()
            });

            if (response.ok) {
                const stats = await response.json();
                this.displayGameStats(stats);
            }
        } catch (error) {
            console.error('Failed to load game stats:', error);
        }
    }

    displayGameStats(stats) {
        document.getElementById('total-games').textContent = stats.totalGames;
        document.getElementById('total-wins').textContent = stats.wins;
        document.getElementById('win-rate').textContent = `${stats.winRate}%`;
    }
}

// Global game manager instance
window.gameManager = new GameManager();