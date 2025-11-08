# CRITICAL FIX: Multiple GameManager Instances & Navigation

## Issues Confirmed
1. **Two balls, two AI paddles going different directions** = Multiple GameManager instances rendering
2. **Quit button not navigating back to config** = Navigation possibly blocked or app reference broken

## Root Cause
The application is creating **multiple GameManager instances**, causing:
- Multiple websocket connections to game backend
- Multiple render loops drawing different game states
- Multiple input handlers
- Conflicting game state

## Critical Fixes Applied

### 1. Singleton Guard in main.ts ✅
**File**: `frontend/src/main.ts`

Added initialization guard to prevent main.ts from executing multiple times:

```typescript
// GUARD: Prevent multiple initializations
if ((window as any).__appInitialized) {
  console.error('⚠️⚠️⚠️ main.ts already executed!');
  throw new Error('Application already initialized');
}
(window as any).__appInitialized = true;

// SINGLETON checks for each manager
if (!(window as any).gameManager) {
  (window as any).gameManager = new GameManager();
} else {
  console.warn('⚠️ GameManager already exists, skipping');
}
```

### 2. Enforced Singleton in GameManager ✅
**File**: `frontend/src/game.ts`

Changed from warning to **THROWING ERROR** on duplicate instance:

```typescript
constructor() {
  GameManager.instanceCounter++;
  this.instanceId = GameManager.instanceCounter;
  
  // ENFORCE SINGLETON: Only allow ONE instance
  if (GameManager.instanceCounter > 1) {
    console.error(`⚠️⚠️⚠️ BLOCKING DUPLICATE INSTANCE #${this.instanceId}`);
    throw new Error('GameManager instance rejected - only one allowed!');
  }
}
```

### 3. Enhanced Navigation Logging ✅
**File**: `frontend/src/game.ts`

Added comprehensive logging in stopGame():

```typescript
console.log('🛑 Attempting navigation to play-config');
console.log('🛑 App exists:', !!app, 'Router exists:', !!(app && app.router));

if (app && app.router && typeof app.router.navigate === 'function') {
  console.log('🛑 Calling router.navigate()');
  app.router.navigate('play-config');
  console.log('🛑 Navigation completed');
} else {
  console.error('🛑 ERROR: Cannot navigate - app or router not available!');
}
```

## Testing Instructions

### Critical Test: Single Instance Verification

1. **Open browser console BEFORE loading page**
2. **Refresh page completely** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Look for main.ts execution**:

**✅ CORRECT OUTPUT:**
```
🚀 [MAIN] main.ts executing...
✅ [MAIN] Creating AuthManager
✅ [MAIN] Creating GameManager
🎮 [GameManager] Constructor called - creating instance #1
✅ [MAIN] Creating App
🏗️ [App] Constructor called - Creating new App instance
🏁 [MAIN] main.ts initialization complete
```

**❌ BAD OUTPUT (Problem):**
```
🚀 [MAIN] main.ts executing...
🚀 [MAIN] main.ts executing...  ← DUPLICATE!
```
OR
```
🎮 [GameManager] Constructor called - creating instance #1
🎮 [GameManager] Constructor called - creating instance #2  ← DUPLICATE!
⚠️⚠️⚠️ MULTIPLE GameManager instances!
Error: GameManager instance rejected
```

### Test 2: Game Visual Check

1. **Start any game mode**
2. **Count game objects**:
   - Should see: **1 ball, 2 paddles (left & right)**
   - Should NOT see: 2 balls, 4 paddles, blinking
3. **Watch ball behavior**:
   - Should move smoothly in ONE direction
   - Should NOT blink or jump
   - Should NOT have two balls going different ways

### Test 3: Quit Button Navigation

1. **Start a game**
2. **Click QUIT button**
3. **Check console**:
```
🛑 [UI] Stop button clicked
🛑 [GM#1] stopGame called
🛑 [GM#1] Game stopped - attempting navigation
🛑 [GM#1] App exists: true, Router exists: true
🛑 [GM#1] Calling router.navigate('play-config')
🛑 [GM#1] Navigation completed
```
4. **Check UI**: Should navigate to play-config screen

### Test 4: No Blinking After Quit

1. **Start a game**
2. **Click QUIT**
3. **Watch screen for 5 seconds**
4. **Should see**: Static play-config screen, no game objects
5. **Should NOT see**: Blinking, game still rendering, paddles/balls

## Diagnostic Commands

If issues persist, check these in browser console:

### Check Instance Count:
```javascript
// Should be 1, if >1 there's a problem
console.log('GameManager instances:', (window.gameManager?.constructor?.instanceCounter || 0));
```

### Check Singleton Guards:
```javascript
// Should be true, if false main.ts can run again
console.log('App initialized flag:', window.__appInitialized);
```

### Check Manager References:
```javascript
// All should exist
console.log('AuthManager:', !!window.authManager);
console.log('GameManager:', !!window.gameManager);
console.log('App:', !!window.app);
console.log('Router:', !!window.app?.router);
```

### Force Stop All Games:
```javascript
// Emergency stop if games won't quit
if (window.gameManager) {
  window.gameManager.isPlaying = false;
  window.gameManager.isPaused = false;
  if (window.gameManager.websocket) {
    window.gameManager.websocket.close();
    window.gameManager.websocket = null;
  }
  window.gameManager.gameState = null;
}
```

## Expected Behavior After Fix

✅ **On Load**:
- Exactly ONE main.ts execution
- Exactly ONE GameManager instance (#1)
- Exactly ONE App instance
- All singleton guards active

✅ **During Game**:
- ONE ball moving smoothly
- TWO paddles (left and right) 
- No blinking or duplicate objects
- Smooth animation

✅ **On Quit**:
- Logs show navigation attempt
- Successfully navigates to play-config
- Game completely stops (no more state updates)
- No error messages

## Files Modified

1. **frontend/src/main.ts**:
   - Added `__appInitialized` flag
   - Added singleton checks for all managers
   - Enhanced logging

2. **frontend/src/game.ts**:
   - Changed instance warning to ERROR throw
   - Added navigation diagnostic logging
   - Enhanced stopGame logging

## If Issues Still Persist

If you still see multiple instances after these fixes:

1. **Check browser cache**: Hard refresh (Ctrl+Shift+R)
2. **Check for circular imports**: Could cause module duplication
3. **Check Vite build**: Ensure proper module bundling
4. **Check for iframes**: Multiple contexts could create multiple instances
5. **Check browser extensions**: Some extensions reload scripts

## Rebuild Required

These changes require a full rebuild:

```bash
make stop
make start
```

Then perform all tests above in a fresh browser tab.
