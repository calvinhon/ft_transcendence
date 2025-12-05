# Test Suite: AI Opponent

## Module: Introduce an AI Opponent
**Points:** 10 (Major)  
**Framework:** TypeScript  
**Date:** December 5, 2025

---

## Test 1: AI Player Instantiation

### Objective
Verify AI player can be created with different difficulty levels.

### Test Steps
1. Create AI player with easy difficulty
2. Create AI player with medium difficulty
3. Create AI player with hard difficulty
4. Verify initialization

### Test Commands
```bash
cd frontend

# Run AI player unit tests
npm test -- --testNamePattern="AI.*instantiation"

# Or manually test in game
npm run dev
# In browser console:
// const ai = new AIPlayer('easy');
// console.log(ai.difficulty);
```

### Expected Results
```
✅ AI Player created with difficulty='easy'
✅ AI Player created with difficulty='medium'
✅ AI Player created with difficulty='hard'
✅ All properties initialized correctly
```

### Pass Criteria
- AI player object created successfully
- Difficulty property set correctly
- Paddle initialized
- Position tracking working

---

## Test 2: Ball Position Prediction

### Objective
Verify ball position prediction algorithm is accurate.

### Test Steps
1. Set ball at known position
2. Set ball velocity
3. Predict position at time T
4. Verify prediction accuracy

### Test Commands
```bash
npm test -- --testNamePattern="predictBallPosition"

# Or test manually:
// const ai = new AIPlayer('medium');
// const ballPos = { x: 100, y: 200 };
// const ballVel = { x: 5, y: 2 };
// const predicted = ai.predictBallPosition(ballPos, ballVel);
// console.log(predicted);
```

### Test Scenario 1: Straight Path
```
Initial position: (100, 200)
Velocity: (5, 0) per frame
Time to paddle: 4 frames (at x=120)
Expected Y: 200 (no vertical movement)
```

### Test Scenario 2: Diagonal Path
```
Initial position: (100, 200)
Velocity: (5, 3) per frame
Time to paddle: 4 frames
Expected Y: 212 (200 + 3*4)
```

### Pass Criteria
- Predictions accurate within 5 pixels
- Accounts for velocity correctly
- Handles edge cases (ball near wall)
- Calculation time < 1ms

---

## Test 3: Paddle Movement Calculation

### Objective
Verify AI calculates paddle movement correctly.

### Test Steps
1. Set ball position
2. Get AI movement command
3. Verify movement matches strategy
4. Test all directions

### Test Commands
```bash
npm test -- --testNamePattern="paddle.*movement"

// Manual test:
// const ai = new AIPlayer('medium');
// ai.ballPosition = { x: 200, y: 100 };
// ai.paddle.y = 200;
// ai.paddle.height = 50;
// const move = ai.calculateMove({ x: 200, y: 100 }, { x: 5, y: 2 });
// console.log(move); // -1 (up), 0 (stay), or 1 (down)
```

### Test Scenario 1: Ball Above Paddle
```
Ball predicted Y: 50
Paddle center Y: 200
Expected: -1 (move up)
```

### Test Scenario 2: Ball Below Paddle
```
Ball predicted Y: 350
Paddle center Y: 200
Expected: 1 (move down)
```

### Test Scenario 3: Ball Near Paddle
```
Ball predicted Y: 198
Paddle center Y: 200
Threshold: 10 pixels
Expected: 0 (stay)
```

### Pass Criteria
- Movement correct for each scenario
- Threshold working properly
- Response time < 16ms
- Smooth movement transitions

---

## Test 4: Difficulty Levels

### Objective
Verify AI behavior differs by difficulty.

### Test Steps
1. Create AI with each difficulty
2. Run same ball scenario
3. Compare response times
4. Verify decision consistency

### Test Commands
```bash
npm test -- --testNamePattern="difficulty"

// Manual comparison:
// const ballScenario = { pos: {x: 200, y: 100}, vel: {x: 5, y: 2} };
// const easyAI = new AIPlayer('easy');
// const mediumAI = new AIPlayer('medium');
// const hardAI = new AIPlayer('hard');

// easyAI.calculateMove(ballScenario.pos, ballScenario.vel);   // Should be slower/less accurate
// mediumAI.calculateMove(ballScenario.pos, ballScenario.vel); // Balanced
// hardAI.calculateMove(ballScenario.pos, ballScenario.vel);   // Faster/more accurate
```

### Difficulty Characteristics

**Easy:**
- Reaction time: 200-300ms
- Prediction accuracy: 70-80%
- Threshold: 20 pixels
- Occasional mistakes

**Medium:**
- Reaction time: 100-150ms
- Prediction accuracy: 85-95%
- Threshold: 10 pixels
- Consistent play

**Hard:**
- Reaction time: 30-50ms
- Prediction accuracy: 98%+
- Threshold: 5 pixels
- Near-perfect play

### Pass Criteria
- Each difficulty plays differently
- Easy < Medium < Hard in capability
- Difficulty progression smooth
- All difficulties beatable with skill

---

## Test 5: Reaction Time Simulation

### Objective
Verify AI has realistic reaction times.

### Test Steps
1. Measure movement decision time
2. Add reaction delay based on difficulty
3. Verify delays are realistic
4. Check for latency spikes

### Test Commands
```bash
npm test -- --testNamePattern="reaction.*time"

// Manual test:
// const startTime = performance.now();
// const move = ai.calculateMove(ballPos, ballVel);
// const endTime = performance.now();
// console.log(`Decision time: ${endTime - startTime}ms`);
```

### Expected Reaction Times
```
Easy:   80-150ms (human baseline)
Medium: 40-80ms (skilled player)
Hard:   20-40ms (professional)
```

### Pass Criteria
- Reaction times within expected range
- Times consistent for same difficulty
- No unexplained delays
- Realistic for difficulty level

---

## Test 6: Paddle Movement Smoothness

### Objective
Verify paddle movement is smooth, not jerky.

### Test Steps
1. Track paddle position over 60 frames
2. Analyze movement pattern
3. Verify no sudden jumps
4. Check velocity consistency

### Test Commands
```bash
npm test -- --testNamePattern="smoothness"

// Manual test:
// const positions = [];
// for (let i = 0; i < 60; i++) {
//   ai.update(deltaTime);
//   positions.push(ai.paddle.y);
// }
// // Analyze: positions should change gradually, not jump
```

### Pass Criteria
- Paddle Y changes are incremental
- Movement speed consistent
- No position jumps > 10 pixels/frame
- Smooth acceleration/deceleration

---

## Test 7: Win/Loss Scenarios

### Objective
Verify AI can both win and lose appropriately.

### Test Steps
1. Run AI vs simple algorithm
2. Run multiple games
3. Verify AI wins sometimes, loses sometimes
4. Check win rate by difficulty

### Test Commands
```bash
npm test -- --testNamePattern="game.*outcome|win.*rate"

// Manual test scenario:
// for (let games = 0; games < 10; games++) {
//   const game = startGame(ai, { difficulty: 'easy' });
//   game.run();
//   console.log(`Game ${games}: ${game.winner}`);
// }
```

### Expected Win Rates
```
Easy AI:   30-50% win rate vs good player
Medium AI: 50-70% win rate vs good player
Hard AI:   80-95% win rate vs good player
```

### Pass Criteria
- Easy AI is beatable
- Medium AI is competitive
- Hard AI is very challenging
- Win rates match difficulty

---

## Test 8: Edge Cases

### Objective
Verify AI handles edge cases correctly.

### Test Steps
1. Ball near top edge
2. Ball near bottom edge
3. Ball moving very fast
4. Ball moving very slow

### Test Commands
```bash
npm test -- --testNamePattern="edge.*case"

// Test ball near top:
// const move = ai.calculateMove({ x: 200, y: 5 }, { x: 5, y: 2 });
// // Should move up to intercept

// Test ball near bottom:
// const move = ai.calculateMove({ x: 200, y: 595 }, { x: 5, y: -2 });
// // Should move down to intercept

// Test fast ball:
// const move = ai.calculateMove({ x: 200, y: 300 }, { x: 15, y: 10 });
// // Should still calculate correctly

// Test slow ball:
// const move = ai.calculateMove({ x: 200, y: 300 }, { x: 1, y: 0.5 });
// // Should predict accurately
```

### Pass Criteria
- Top edge cases handled
- Bottom edge cases handled
- Fast ball prediction accurate
- Slow ball prediction accurate
- No division by zero
- No array out of bounds

---

## Test 9: AI vs Player Gameplay

### Objective
Verify AI plays correctly in actual game.

### Test Steps
1. Start single-player game vs AI
2. Play full game
3. Verify AI makes moves
4. Verify ball is tracked
5. Verify scoring works

### Test Commands
```bash
# Manual gameplay test:
npm run dev
# In browser:
// 1. Click "Single Player"
// 2. Select difficulty (Easy/Medium/Hard)
// 3. Play game for 30 seconds
// 4. Observe AI paddle moving
// 5. Check scores updating
// 6. Verify game doesn't crash
```

### Expected Behavior
- AI paddle follows ball
- AI returns serves
- Ball movement realistic
- Scores update correctly
- Game runs at 60 FPS

### Pass Criteria
- AI moves appropriately
- No crashes during gameplay
- No lag or stuttering
- AI difficulty affects gameplay
- Game completes without error

---

## Test 10: AI Training/Learning

### Objective
Verify AI improves or adapts if learning implemented.

### Test Steps
1. Track AI performance over time
2. Check for pattern recognition
3. Verify adaptation to player style
4. Measure improvement

### Test Commands
```bash
npm test -- --testNamePattern="learning|adaptation"

// Manual test:
// Play 10 games and track stats:
// const stats = [];
// for (let i = 0; i < 10; i++) {
//   const game = startGame(hardAI, player);
//   const result = game.run();
//   stats.push({
//     gameNumber: i,
//     aiScore: result.aiScore,
//     playerScore: result.playerScore
//   });
// }
```

### Pass Criteria (if learning implemented)
- AI performance improves over games
- AI adapts to player style
- Adaptation is gradual, not sudden
- Learning doesn't break easy mode

---

## Test 11: Memory and Performance

### Objective
Verify AI doesn't cause memory leaks or performance issues.

### Test Steps
1. Monitor memory usage during long game
2. Check for object leaks
3. Verify frame rate maintained
4. Check CPU usage

### Test Commands
```bash
# Manual performance test:
npm run dev
# In browser DevTools:
// 1. Open Performance tab
// 2. Start recording
// 3. Play game for 5 minutes
// 4. Stop recording
// 5. Check for memory growth
// 6. Check frame rate consistency

// Or use Chrome DevTools Memory profiler:
// 1. Take heap snapshot
// 2. Play game 5 minutes
// 3. Take another snapshot
// 4. Compare for growth
```

### Pass Criteria
- Memory stable over time
- No memory growth > 10MB over 5 minutes
- FPS stays at 60 or target
- CPU usage reasonable (< 50%)
- No console errors

---

## Test 12: Multiplayer Compatibility

### Objective
Verify AI integration doesn't break multiplayer mode.

### Test Steps
1. Start multiplayer game (player vs player)
2. AI not created in this mode
3. Verify normal multiplayer works
4. Check no AI code executed

### Test Commands
```bash
# Manual test:
npm run dev
// 1. Select "Multiplayer" game mode
// 2. Connect two clients
// 3. Play game normally
// 4. Verify both players move
// 5. Verify AI not interfering
// 6. Check browser console for errors
```

### Pass Criteria
- Multiplayer works without AI
- No AI objects created
- No AI memory allocated
- Multiplayer frame rate unaffected
- Code path doesn't execute AI

---

## Summary

**AI Module:** ✅  
**Difficulty Levels:** Easy, Medium, Hard  
**Total Tests:** 12  
**Pass Criteria:** All 12 must pass

### Quick Test Commands
```bash
# Unit tests
npm test

# Integration test (manual)
npm run dev
# Browser: Select Single Player > Choose Difficulty > Play

# Performance test
npm run dev
# DevTools: Memory & Performance tabs
```

### Expected Test Results
```
AI Opponent Test Suite
  ✓ AI player instantiation
  ✓ Ball position prediction
  ✓ Paddle movement calculation
  ✓ Difficulty levels differ
  ✓ Reaction time simulation
  ✓ Movement smoothness
  ✓ Win/loss scenarios
  ✓ Edge cases handled
  ✓ AI vs player gameplay
  ✓ AI training/learning
  ✓ Memory and performance
  ✓ Multiplayer compatibility

12 passing
```

---

*Test Suite Created: December 5, 2025*
