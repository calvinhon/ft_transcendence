# Safe Refactoring Plan - Code Files >300 Lines

## Current Status Analysis

### Files >300 Lines (Priority Order)
1. **frontend/src/game.ts** (3544 lines) ⚠️ CRITICAL
2. **frontend/src/app.ts** (1953 lines) ⚠️ CRITICAL
3. **game-service/src/routes/game.ts** (1429 lines) ⚠️ CRITICAL - Backend
4. **frontend/src/tournament.ts** (1409 lines) ⚠️ CRITICAL
5. **tournament-service/src/routes/tournament.ts** (981 lines) 🔴 HIGH - Backend
6. **frontend/src/local-player.ts** (948 lines) 🔴 HIGH
7. **user-service/src/routes/user.ts** (696 lines) 🔴 HIGH - Backend
8. **frontend/src/match.ts** (675 lines) 🟡 MEDIUM
9. **frontend/src/profile.ts** (569 lines) 🟡 MEDIUM
10. **auth-service/src/routes/auth.ts** (530 lines) 🟡 MEDIUM - Backend
11. **frontend/src/game/CampaignMode.ts** (469 lines) 🟡 MEDIUM - RECENTLY CREATED
12. **tournament-service/src/routes/tournament.fixed.ts** (461 lines) 🟡 MEDIUM - Backend
13. **frontend/src/game/GameRenderer.ts** (307 lines) ✅ OK - RECENTLY CREATED

### Already Refactored (✅ Good Size)
- `frontend/src/game/InputHandler.ts` (263 lines)
- `frontend/src/game/WebSocketClient.ts` (125 lines)

---

## Refactoring Strategy

### Phase 1: Frontend Core Game System (PRIORITY 1)
**Goal**: Reduce game.ts from 3544 → <500 lines

#### ✅ Already Completed:
- InputHandler.ts (282 lines extracted)
- GameRenderer.ts (341 lines extracted)
- WebSocketClient.ts (124 lines extracted)
- CampaignMode.ts (469 lines created - needs integration)

#### 📋 Step 1A: Integrate CampaignMode.ts into game.ts
**Safety Level**: 🟢 LOW RISK
**Estimated Reduction**: ~400 lines
**Time**: 30 mins

**Actions**:
1. Import CampaignMode into game.ts
2. Replace all campaign methods with CampaignMode calls
3. Test campaign mode thoroughly
4. Commit changes

**Methods to Replace**:
- `loadPlayerCampaignLevel()` → `campaignMode.getCurrentLevel()`
- `syncCampaignLevelFromDatabase()` → internal to CampaignMode
- `getCampaignLevelSettings()` → `campaignMode.getLevelSettings()`
- `progressToNextLevel()` → `campaignMode.progressToNextLevel()`
- `updateCampaignUI()` → `campaignMode.updateUI()`
- `showLevelUpMessageWithConfirm()` → `campaignMode.showLevelUpMessage()`
- `showCampaignCompleteMessage()` → `campaignMode.showCompleteMessage()`
- `showRetryMessage()` → `campaignMode.showRetryMessage()`
- All other campaign-related methods

**Expected Result**: game.ts → ~3100 lines

---

#### 📋 Step 1B: Extract Arcade Mode Manager
**Safety Level**: 🟡 MEDIUM RISK
**Estimated Reduction**: ~300 lines
**Time**: 45 mins

**Create**: `frontend/src/game/ArcadeMode.ts`

**Responsibilities**:
- Team player management
- Arcade-specific WebSocket connection (`connectToArcadeGameServer`)
- Arcade match setup and configuration
- Team assignment logic
- Arcade UI updates

**Methods to Extract**:
- `startArcadeMatch()`
- `startArcadeMatchWithSettings()`
- `connectToArcadeGameServer()`
- `updateArcadeUI()`
- Team player management logic

**Expected Result**: game.ts → ~2800 lines

---

#### 📋 Step 1C: Extract Tournament Mode Manager
**Safety Level**: 🟡 MEDIUM RISK
**Estimated Reduction**: ~200 lines
**Time**: 30 mins

**Create**: `frontend/src/game/TournamentMode.ts`

**Responsibilities**:
- Tournament match initialization
- Tournament-specific connection handling
- Tournament player data management
- Tournament game end handling

**Methods to Extract**:
- `startTournamentMatch()`
- `handleTournamentGameEnd()`
- Tournament-specific logic from `startGame()`

**Expected Result**: game.ts → ~2600 lines

---

#### 📋 Step 1D: Extract Game State Manager
**Safety Level**: 🟢 LOW RISK
**Estimated Reduction**: ~300 lines
**Time**: 45 mins

**Create**: `frontend/src/game/GameStateManager.ts`

**Responsibilities**:
- Game state updates from backend
- Score tracking and display
- Game lifecycle (start, pause, stop, end)
- Canvas initialization

**Methods to Extract**:
- `startGame()`
- `updateGameFromBackend()`
- `updateScoreDisplay()`
- `pauseGame()`
- `stopGame()`
- `endGame()`
- `ensureCanvasInitialized()`
- `initCanvas()`

**Expected Result**: game.ts → ~2300 lines

---

#### 📋 Step 1E: Extract Settings Manager
**Safety Level**: 🟢 LOW RISK
**Estimated Reduction**: ~200 lines
**Time**: 20 mins

**Create**: `frontend/src/game/GameSettings.ts`

**Responsibilities**:
- Game settings management
- Settings getters (ballSpeed, paddleSpeed, etc.)
- Settings validation
- Default configurations

**Methods to Extract**:
- `getGameSettings()`
- `getBallSpeedValue()`
- `getPaddleSpeedValue()`
- `getAIDifficulty()`
- `isAccelerateOnHitEnabled()`
- `getScoreToWin()`

**Expected Result**: game.ts → ~2100 lines

---

#### 📋 Step 1F: Extract Remaining Render Methods
**Safety Level**: 🟢 LOW RISK
**Estimated Reduction**: ~500 lines
**Time**: 45 mins

**Update**: `frontend/src/game/GameRenderer.ts`

**Methods to Move**:
- `render()` - simplify to single renderer call
- `drawBallWithTrail()` → Move to GameRenderer
- `getBallColors()` → Move to GameRenderer
- `drawPlayerInfo()` → Move to GameRenderer
- `drawPlayerInfoSection()` → Move to GameRenderer
- `drawArcadeControls()` → Move to GameRenderer
- `drawCountdownOverlay()` → Move to GameRenderer

**Expected Result**: game.ts → ~1600 lines

---

#### 📋 Step 1G: Clean Up Input Handler Integration
**Safety Level**: 🟢 LOW RISK
**Estimated Reduction**: ~400 lines
**Time**: 30 mins

**Actions**:
1. Remove duplicate input methods still in game.ts
2. Ensure all input goes through InputHandler
3. Remove `keys` object and key monitoring

**Methods to Remove**:
- `handleCoopInputs()` - Already in InputHandler
- `handleTournamentInputs()` - Already in InputHandler
- `handleArcadeInputs()` - Already in InputHandler
- `startKeyMonitor()` - No longer needed
- `setupEventListeners()` - Simplify to non-keyboard events only

**Expected Result**: game.ts → ~1200 lines

---

#### 📋 Step 1H: Extract Connection Managers
**Safety Level**: 🟡 MEDIUM RISK
**Estimated Reduction**: ~300 lines
**Time**: 45 mins

**Create**: `frontend/src/game/GameConnectionManager.ts`

**Responsibilities**:
- Consolidate all WebSocket connection methods
- Connection lifecycle management
- Message routing

**Methods to Consolidate**:
- `connectToGameServer()` - Already uses WebSocketClient
- `connectToBotGameServer()` - Merge into one method
- `connectToCampaignGameServer()` - Merge into one method
- All connection-related logic

**Expected Result**: game.ts → ~900 lines

---

#### 📋 Step 1I: Extract UI/DOM Helpers
**Safety Level**: 🟢 LOW RISK
**Estimated Reduction**: ~200 lines
**Time**: 20 mins

**Create**: `frontend/src/game/GameUI.ts`

**Responsibilities**:
- DOM manipulation helpers
- UI state updates
- Match finding UI
- Game area visibility

**Methods to Extract**:
- `resetFindMatch()`
- `testKeyboard()` - Development helper
- All DOM query/update logic

**Expected Result**: game.ts → ~700 lines

---

#### 📋 Step 1J: Final Cleanup
**Safety Level**: 🟢 LOW RISK
**Estimated Reduction**: ~200 lines
**Time**: 30 mins

**Actions**:
1. Remove commented-out code
2. Consolidate imports
3. Remove duplicate methods
4. Ensure all extracted modules are properly integrated
5. Run full test suite

**Expected Result**: game.ts → **~500 lines** ✅ TARGET ACHIEVED

---

### Phase 2: Frontend App Core (PRIORITY 2)
**Goal**: Reduce app.ts from 1953 → <500 lines

#### 📋 Step 2A: Extract Screen Management
**Create**: `frontend/src/app/ScreenManager.ts`
**Reduction**: ~300 lines

**Responsibilities**:
- Screen routing and visibility
- Screen transition logic
- Active screen tracking

---

#### 📋 Step 2B: Extract Game Mode Selection
**Create**: `frontend/src/app/GameModeManager.ts`
**Reduction**: ~400 lines

**Responsibilities**:
- Game mode selection UI
- Mode-specific settings
- Mode configuration forms

---

#### 📋 Step 2C: Extract Player Management
**Create**: `frontend/src/app/PlayerManager.ts`
**Reduction**: ~400 lines

**Responsibilities**:
- Local player registration
- Player selection
- Team assignment
- Player cards UI

---

#### 📋 Step 2D: Extract Settings UI
**Create**: `frontend/src/app/SettingsUI.ts`
**Reduction**: ~300 lines

**Responsibilities**:
- Settings form management
- Settings validation
- Settings persistence
- UI event handlers

---

#### 📋 Step 2E: Final App Cleanup
**Expected Result**: app.ts → **~500 lines** ✅

---

### Phase 3: Frontend Tournament System (PRIORITY 3)
**Goal**: Reduce tournament.ts from 1409 → <500 lines

#### 📋 Step 3A: Extract Bracket Renderer
**Create**: `frontend/src/tournament/BracketRenderer.ts`
**Reduction**: ~400 lines

**Responsibilities**:
- SVG bracket generation
- Match node rendering
- Bracket layout calculations
- Visual updates

---

#### 📋 Step 3B: Extract Tournament State
**Create**: `frontend/src/tournament/TournamentState.ts`
**Reduction**: ~300 lines

**Responsibilities**:
- Tournament data management
- Match progression logic
- Winner tracking
- State persistence

---

#### 📋 Step 3C: Extract Tournament API
**Create**: `frontend/src/tournament/TournamentAPI.ts`
**Reduction**: ~300 lines

**Responsibilities**:
- Backend API calls
- Tournament CRUD operations
- Match updates
- Result submission

---

#### 📋 Step 3D: Extract Tournament UI
**Create**: `frontend/src/tournament/TournamentUI.ts`
**Reduction**: ~200 lines

**Expected Result**: tournament.ts → **~200 lines** ✅

---

### Phase 4: Frontend Supporting Files (PRIORITY 4)

#### 📋 Step 4A: Refactor local-player.ts (948 lines)
**Target**: <500 lines

**Split into**:
- `local-player/LocalPlayerAuth.ts` (300 lines)
- `local-player/LocalPlayerUI.ts` (300 lines)
- `local-player/LocalPlayerManager.ts` (200 lines)

---

#### 📋 Step 4B: Refactor match.ts (675 lines)
**Target**: <500 lines

**Split into**:
- `match/MatchFinder.ts` (300 lines)
- `match/MatchUI.ts` (200 lines)

---

#### 📋 Step 4C: Refactor profile.ts (569 lines)
**Target**: <500 lines

**Split into**:
- `profile/ProfileData.ts` (250 lines)
- `profile/ProfileUI.ts` (250 lines)

---

### Phase 5: Backend Game Service (PRIORITY 5)
**Goal**: Reduce game-service/src/routes/game.ts from 1429 → <500 lines

#### 📋 Step 5A: Extract Game Physics
**Create**: `game-service/src/game/PhysicsEngine.ts`
**Reduction**: ~400 lines

**Responsibilities**:
- Ball movement
- Collision detection
- Paddle movement
- Physics calculations

---

#### 📋 Step 5B: Extract AI Logic
**Create**: `game-service/src/game/AIPlayer.ts`
**Reduction**: ~300 lines

**Responsibilities**:
- AI difficulty levels
- AI decision making
- AI paddle control

---

#### 📋 Step 5C: Extract Game State
**Create**: `game-service/src/game/GameState.ts`
**Reduction**: ~300 lines

**Responsibilities**:
- Game state management
- Score tracking
- Game lifecycle

---

#### 📋 Step 5D: Extract WebSocket Handlers
**Create**: `game-service/src/game/MessageHandlers.ts`
**Reduction**: ~200 lines

**Expected Result**: game.ts → **~200 lines** ✅

---

### Phase 6: Backend Supporting Services (PRIORITY 6)

#### 📋 Step 6A: Tournament Service (981 lines)
- Extract match logic
- Extract bracket generation
- Extract blockchain integration
**Target**: <500 lines

---

#### 📋 Step 6B: User Service (696 lines)
- Extract profile management
- Extract stats calculations
- Extract leaderboard logic
**Target**: <500 lines

---

#### 📋 Step 6C: Auth Service (530 lines)
- Extract JWT logic
- Extract validation
- Extract password hashing
**Target**: <400 lines

---

## Safety Guidelines

### Before Each Refactoring Step:
1. ✅ **Commit current working state**
2. ✅ **Create new feature branch**: `refactor/step-X`
3. ✅ **Run all tests** to establish baseline
4. ✅ **Document current behavior** if no tests exist

### During Refactoring:
1. ✅ **One logical change at a time**
2. ✅ **Maintain backward compatibility**
3. ✅ **Keep old code commented until verified**
4. ✅ **Test after each extraction**

### After Each Step:
1. ✅ **Build successfully**: `docker compose build`
2. ✅ **Manual testing** of affected features
3. ✅ **Commit with descriptive message**
4. ✅ **Merge to main branch** if stable

### Rollback Plan:
- Each step is a separate commit
- Can revert to any previous step
- Keep branch history clean
- Tag stable versions

---

## Testing Checklist Per Step

### For Game System Changes:
- [ ] Campaign mode starts and progresses
- [ ] Arcade mode with multiple players
- [ ] Tournament mode 1v1
- [ ] Input controls work (keyboard)
- [ ] Rendering works correctly
- [ ] WebSocket connection stable
- [ ] Game end/win conditions work

### For App Changes:
- [ ] Screen navigation works
- [ ] Player registration/login
- [ ] Settings save and load
- [ ] Mode selection UI functional

### For Tournament Changes:
- [ ] Bracket renders correctly
- [ ] Match progression works
- [ ] Winner determination correct
- [ ] Blockchain integration (if applicable)

### For Backend Changes:
- [ ] API endpoints respond
- [ ] WebSocket messages handled
- [ ] Database operations work
- [ ] No memory leaks
- [ ] Proper error handling

---

## Success Metrics

### Code Quality:
- ✅ All files <500 lines (Target: <300 ideal)
- ✅ Clear separation of concerns
- ✅ Reusable modules
- ✅ Easy to test
- ✅ Well-documented

### Maintainability:
- ✅ New developers can understand code
- ✅ Easy to add new features
- ✅ Bug fixes are localized
- ✅ Reduced code duplication

### Performance:
- ✅ No performance regression
- ✅ Faster build times (smaller files)
- ✅ Better code splitting

---

## Timeline Estimate

### Phase 1 (Game.ts): **6-8 hours**
- Steps A-J: 30-45 mins each
- Testing: 2 hours
- Buffer: 1 hour

### Phase 2 (App.ts): **5-6 hours**
- Steps A-E: 30-45 mins each
- Testing: 1.5 hours
- Buffer: 1 hour

### Phase 3 (Tournament.ts): **4-5 hours**
- Steps A-D: 45 mins each
- Testing: 1.5 hours
- Buffer: 30 mins

### Phase 4 (Supporting Files): **4-5 hours**
- 3 files: 1-1.5 hours each
- Testing: 1 hour

### Phase 5 (Backend Game): **5-6 hours**
- Steps A-D: 1 hour each
- Testing: 2 hours

### Phase 6 (Backend Services): **6-8 hours**
- 3 services: 2 hours each
- Testing: 2 hours

**Total Estimated Time: 30-38 hours**
**Recommended Pace: 2-3 phases per week**
**Total Duration: 2-3 weeks**

---

## Current Status

### ✅ Completed:
- CampaignMode.ts created (469 lines)
- InputHandler.ts created (263 lines)
- GameRenderer.ts created (307 lines)
- WebSocketClient.ts created (125 lines)

### 🔄 In Progress:
- **Phase 1, Step 1A**: Need to integrate CampaignMode.ts into game.ts

### ⏭️ Next Steps:
1. Integrate CampaignMode.ts → Reduce game.ts by ~400 lines
2. Extract ArcadeMode → Reduce game.ts by ~300 lines
3. Extract TournamentMode → Reduce game.ts by ~200 lines
4. Continue with remaining Phase 1 steps

---

## Notes

- Prioritize frontend first (user-facing features)
- Backend can be refactored in parallel
- Each phase is independent
- Can pause/resume at any step
- Always maintain working state
- Communication with team after each phase
