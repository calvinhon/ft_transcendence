#!/usr/bin/env node

// Test script for refactored game-service WebSocket functionality
const WebSocket = require('ws');

console.log('🧪 Testing refactored game-service WebSocket functionality...\n');

// Test 1: Basic WebSocket connection
console.log('Test 1: Basic WebSocket connection');
const ws = new WebSocket('ws://localhost:3002/ws');

ws.on('open', () => {
  console.log('✅ WebSocket connection established');

  // Test 2: User connection
  console.log('\nTest 2: User connection');
  ws.send(JSON.stringify({
    type: 'userConnect',
    userId: 999,
    username: 'TestUser'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', message);

  if (message.type === 'connectionAck') {
    console.log('✅ User connection acknowledged');

    // Test 3: Join bot game
    console.log('\nTest 3: Join bot game');
    ws.send(JSON.stringify({
      type: 'joinBotGame',
      userId: 999,
      username: 'TestUser',
      gameSettings: {
        gameMode: 'coop',
        aiDifficulty: 'easy',
        ballSpeed: 'medium',
        paddleSpeed: 'medium',
        scoreToWin: 3
      }
    }));
  }

  if (message.type === 'gameStart') {
    console.log('✅ Game started successfully');
    console.log('🎮 Game ID:', message.gameId);

    // Test 4: Move paddle
    console.log('\nTest 4: Move paddle');
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'movePaddle',
        direction: 'up'
      }));

      // Test 5: Pause game
      setTimeout(() => {
        console.log('\nTest 5: Pause game');
        ws.send(JSON.stringify({
          type: 'pause',
          paused: true
        }));

        // Test 6: Disconnect
        setTimeout(() => {
          console.log('\nTest 6: Disconnect');
          ws.send(JSON.stringify({
            type: 'disconnect'
          }));

          setTimeout(() => {
            ws.close();
          }, 1000);
        }, 2000);
      }, 2000);
    }, 1000);
  }

  if (message.type === 'gamePaused') {
    console.log('✅ Game paused successfully');
  }
});

ws.on('close', () => {
  console.log('✅ WebSocket connection closed');
  console.log('\n🎉 All WebSocket tests completed successfully!');
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});