# Refactoring TODO Checklist

## Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked/Issue

---

## Phase 1: Frontend Game System (game.ts: 3544 → 500 lines)

### Already Completed ✅
- [x] Create InputHandler.ts (263 lines)
- [x] Create GameRenderer.ts (307 lines)
- [x] Create WebSocketClient.ts (125 lines)
- [x] Create CampaignMode.ts (469 lines)

### Step 1A: Integrate CampaignMode [~]
- [~] Import CampaignMode into game.ts
- [ ] Replace loadPlayerCampaignLevel()
- [ ] Replace syncCampaignLevelFromDatabase()
- [ ] Replace getCampaignLevelSettings()
- [ ] Replace progressToNextLevel()
- [ ] Replace updateCampaignUI()
- [ ] Replace showLevelUpMessageWithConfirm()
- [ ] Replace showCampaignCompleteMessage()
- [ ] Replace showRetryMessage()
- [ ] Remove old campaign methods from game.ts
- [ ] Test campaign mode: start game
- [ ] Test campaign mode: level progression
- [ ] Test campaign mode: UI updates
- [ ] Test campaign mode: win/lose scenarios
- [ ] Build and deploy
- [ ] Commit: "refactor: integrate CampaignMode into game.ts"
**Expected**: game.ts → ~3100 lines

### Step 1B: Extract Arcade Mode Manager [ ]
- [ ] Create frontend/src/game/ArcadeMode.ts
- [ ] Move startArcadeMatch()
- [ ] Move startArcadeMatchWithSettings()
- [ ] Move connectToArcadeGameServer()
- [ ] Move updateArcadeUI()
- [ ] Move team player management logic
- [ ] Import ArcadeMode into game.ts
- [ ] Replace all arcade method calls
- [ ] Test arcade mode: team selection
- [ ] Test arcade mode: multi-player game
- [ ] Test arcade mode: controls
- [ ] Build and deploy
- [ ] Commit: "refactor: extract ArcadeMode manager"
**Expected**: game.ts → ~2800 lines

### Step 1C: Extract Tournament Mode Manager [ ]
- [ ] Create frontend/src/game/TournamentMode.ts
- [ ] Move startTournamentMatch()
- [ ] Move handleTournamentGameEnd()
- [ ] Move tournament-specific logic
- [ ] Import TournamentMode into game.ts
- [ ] Replace all tournament method calls
- [ ] Test tournament mode: 1v1 setup
- [ ] Test tournament mode: game flow
- [ ] Test tournament mode: winner reporting
- [ ] Build and deploy
- [ ] Commit: "refactor: extract TournamentMode manager"
**Expected**: game.ts → ~2600 lines

### Step 1D: Extract Game State Manager [ ]
- [ ] Create frontend/src/game/GameStateManager.ts
- [ ] Move startGame()
- [ ] Move updateGameFromBackend()
- [ ] Move updateScoreDisplay()
- [ ] Move pauseGame()
- [ ] Move stopGame()
- [ ] Move endGame()
- [ ] Move ensureCanvasInitialized()
- [ ] Move initCanvas()
- [ ] Import GameStateManager into game.ts
- [ ] Replace all state management calls
- [ ] Test: game start
- [ ] Test: game pause/resume
- [ ] Test: game end
- [ ] Test: score updates
- [ ] Build and deploy
- [ ] Commit: "refactor: extract GameStateManager"
**Expected**: game.ts → ~2300 lines

### Step 1E: Extract Settings Manager [ ]
- [ ] Create frontend/src/game/GameSettings.ts
- [ ] Move getGameSettings()
- [ ] Move getBallSpeedValue()
- [ ] Move getPaddleSpeedValue()
- [ ] Move getAIDifficulty()
- [ ] Move isAccelerateOnHitEnabled()
- [ ] Move getScoreToWin()
- [ ] Import GameSettings into game.ts
- [ ] Replace all settings getters
- [ ] Test: settings are applied correctly
- [ ] Build and deploy
- [ ] Commit: "refactor: extract GameSettings manager"
**Expected**: game.ts → ~2100 lines

### Step 1F: Complete Rendering Extraction [ ]
- [ ] Update GameRenderer.ts
- [ ] Move render() simplification
- [ ] Move drawBallWithTrail() to GameRenderer
- [ ] Move getBallColors() to GameRenderer
- [ ] Move drawPlayerInfo() to GameRenderer
- [ ] Move drawPlayerInfoSection() to GameRenderer
- [ ] Move drawArcadeControls() to GameRenderer
- [ ] Move drawCountdownOverlay() to GameRenderer
- [ ] Update game.ts to use renderer only
- [ ] Test: all rendering modes
- [ ] Test: visual correctness
- [ ] Build and deploy
- [ ] Commit: "refactor: complete rendering extraction"
**Expected**: game.ts → ~1600 lines

### Step 1G: Clean Up Input Handler [ ]
- [ ] Remove handleCoopInputs() from game.ts
- [ ] Remove handleTournamentInputs() from game.ts
- [ ] Remove handleArcadeInputs() from game.ts
- [ ] Remove startKeyMonitor() from game.ts
- [ ] Remove keys object
- [ ] Remove keyMonitorInterval
- [ ] Simplify setupEventListeners()
- [ ] Test: all input modes work
- [ ] Test: keyboard controls
- [ ] Build and deploy
- [ ] Commit: "refactor: remove duplicate input methods"
**Expected**: game.ts → ~1200 lines

### Step 1H: Extract Connection Managers [ ]
- [ ] Create frontend/src/game/GameConnectionManager.ts
- [ ] Consolidate connectToGameServer()
- [ ] Merge connectToBotGameServer()
- [ ] Merge connectToCampaignGameServer()
- [ ] Move message routing logic
- [ ] Import GameConnectionManager into game.ts
- [ ] Replace all connection calls
- [ ] Test: WebSocket connections
- [ ] Test: message handling
- [ ] Build and deploy
- [ ] Commit: "refactor: extract connection manager"
**Expected**: game.ts → ~900 lines

### Step 1I: Extract UI/DOM Helpers [ ]
- [ ] Create frontend/src/game/GameUI.ts
- [ ] Move resetFindMatch()
- [ ] Move testKeyboard()
- [ ] Move all DOM manipulation
- [ ] Import GameUI into game.ts
- [ ] Replace all UI helper calls
- [ ] Test: UI updates correctly
- [ ] Build and deploy
- [ ] Commit: "refactor: extract UI helpers"
**Expected**: game.ts → ~700 lines

### Step 1J: Final Cleanup [ ]
- [ ] Remove commented code
- [ ] Consolidate imports
- [ ] Remove duplicate methods
- [ ] Verify all modules integrated
- [ ] Run full game test suite
- [ ] Build and deploy
- [ ] Commit: "refactor: final game.ts cleanup"
**Expected**: game.ts → **~500 lines ✅**

---

## Phase 2: Frontend App Core (app.ts: 1953 → 500 lines)

### Step 2A: Extract Screen Management [ ]
- [ ] Create frontend/src/app/ScreenManager.ts
- [ ] Move screen routing logic
- [ ] Move screen visibility management
- [ ] Move screen transitions
- [ ] Test: navigation works
- [ ] Commit: "refactor: extract ScreenManager"
**Expected**: app.ts → ~1650 lines

### Step 2B: Extract Game Mode Selection [ ]
- [ ] Create frontend/src/app/GameModeManager.ts
- [ ] Move mode selection UI
- [ ] Move mode-specific settings
- [ ] Move configuration forms
- [ ] Test: mode selection works
- [ ] Commit: "refactor: extract GameModeManager"
**Expected**: app.ts → ~1250 lines

### Step 2C: Extract Player Management [ ]
- [ ] Create frontend/src/app/PlayerManager.ts
- [ ] Move player registration logic
- [ ] Move player selection
- [ ] Move team assignment
- [ ] Move player cards UI
- [ ] Test: player management works
- [ ] Commit: "refactor: extract PlayerManager"
**Expected**: app.ts → ~850 lines

### Step 2D: Extract Settings UI [ ]
- [ ] Create frontend/src/app/SettingsUI.ts
- [ ] Move settings form
- [ ] Move settings validation
- [ ] Move settings persistence
- [ ] Move UI event handlers
- [ ] Test: settings work
- [ ] Commit: "refactor: extract SettingsUI"
**Expected**: app.ts → ~550 lines

### Step 2E: Final App Cleanup [ ]
- [ ] Remove commented code
- [ ] Clean up imports
- [ ] Final optimization
- [ ] Test: full app flow
- [ ] Commit: "refactor: final app.ts cleanup"
**Expected**: app.ts → **~500 lines ✅**

---

## Phase 3: Frontend Tournament System (tournament.ts: 1409 → 500 lines)

### Step 3A: Extract Bracket Renderer [ ]
- [ ] Create frontend/src/tournament/BracketRenderer.ts
- [ ] Move SVG generation
- [ ] Move match node rendering
- [ ] Move layout calculations
- [ ] Test: bracket displays correctly
- [ ] Commit: "refactor: extract BracketRenderer"
**Expected**: tournament.ts → ~1000 lines

### Step 3B: Extract Tournament State [ ]
- [ ] Create frontend/src/tournament/TournamentState.ts
- [ ] Move data management
- [ ] Move match progression
- [ ] Move winner tracking
- [ ] Test: state management works
- [ ] Commit: "refactor: extract TournamentState"
**Expected**: tournament.ts → ~700 lines

### Step 3C: Extract Tournament API [ ]
- [ ] Create frontend/src/tournament/TournamentAPI.ts
- [ ] Move API calls
- [ ] Move CRUD operations
- [ ] Move result submission
- [ ] Test: API integration works
- [ ] Commit: "refactor: extract TournamentAPI"
**Expected**: tournament.ts → ~400 lines

### Step 3D: Extract Tournament UI [ ]
- [ ] Create frontend/src/tournament/TournamentUI.ts
- [ ] Move UI components
- [ ] Move event handlers
- [ ] Test: UI works correctly
- [ ] Commit: "refactor: extract TournamentUI"
**Expected**: tournament.ts → **~200 lines ✅**

---

## Phase 4: Frontend Supporting Files

### Step 4A: Refactor local-player.ts (948 → 500 lines) [ ]
- [ ] Create local-player/LocalPlayerAuth.ts
- [ ] Create local-player/LocalPlayerUI.ts
- [ ] Create local-player/LocalPlayerManager.ts
- [ ] Test: local player features work
- [ ] Commit: "refactor: split local-player into modules"

### Step 4B: Refactor match.ts (675 → 500 lines) [ ]
- [ ] Create match/MatchFinder.ts
- [ ] Create match/MatchUI.ts
- [ ] Test: matchmaking works
- [ ] Commit: "refactor: split match into modules"

### Step 4C: Refactor profile.ts (569 → 500 lines) [ ]
- [ ] Create profile/ProfileData.ts
- [ ] Create profile/ProfileUI.ts
- [ ] Test: profile features work
- [ ] Commit: "refactor: split profile into modules"

---

## Phase 5: Backend Game Service (game.ts: 1429 → 500 lines)

### Step 5A: Extract Game Physics [ ]
- [ ] Create game-service/src/game/PhysicsEngine.ts
- [ ] Move ball movement
- [ ] Move collision detection
- [ ] Move paddle movement
- [ ] Test: game physics accurate
- [ ] Commit: "refactor: extract PhysicsEngine"
**Expected**: game.ts → ~1000 lines

### Step 5B: Extract AI Logic [ ]
- [ ] Create game-service/src/game/AIPlayer.ts
- [ ] Move AI difficulty levels
- [ ] Move AI decision making
- [ ] Move AI paddle control
- [ ] Test: AI behaves correctly
- [ ] Commit: "refactor: extract AIPlayer"
**Expected**: game.ts → ~700 lines

### Step 5C: Extract Game State [ ]
- [ ] Create game-service/src/game/GameState.ts
- [ ] Move state management
- [ ] Move score tracking
- [ ] Move lifecycle management
- [ ] Test: state synchronization works
- [ ] Commit: "refactor: extract GameState"
**Expected**: game.ts → ~400 lines

### Step 5D: Extract WebSocket Handlers [ ]
- [ ] Create game-service/src/game/MessageHandlers.ts
- [ ] Move message handlers
- [ ] Move routing logic
- [ ] Test: WebSocket communication works
- [ ] Commit: "refactor: extract MessageHandlers"
**Expected**: game.ts → **~200 lines ✅**

---

## Phase 6: Backend Supporting Services

### Step 6A: Tournament Service (981 → 500 lines) [ ]
- [ ] Extract match logic
- [ ] Extract bracket generation
- [ ] Extract blockchain integration
- [ ] Test: tournament API works
- [ ] Commit: "refactor: modularize tournament service"

### Step 6B: User Service (696 → 500 lines) [ ]
- [ ] Extract profile management
- [ ] Extract stats calculations
- [ ] Extract leaderboard logic
- [ ] Test: user API works
- [ ] Commit: "refactor: modularize user service"

### Step 6C: Auth Service (530 → 400 lines) [ ]
- [ ] Extract JWT logic
- [ ] Extract validation
- [ ] Extract password hashing
- [ ] Test: authentication works
- [ ] Commit: "refactor: modularize auth service"

---

## Testing Checklist

### After Each Phase:
- [ ] All existing features work
- [ ] No console errors
- [ ] Build succeeds
- [ ] Docker containers start
- [ ] Manual testing complete
- [ ] Code review done
- [ ] Committed and pushed

### Final Integration Test:
- [ ] Full user journey: signup → play → tournament
- [ ] All game modes work
- [ ] No performance regression
- [ ] Code is maintainable
- [ ] Documentation updated

---

## Progress Tracking

**Started**: [DATE]
**Phase 1 Target**: [DATE]
**Phase 2 Target**: [DATE]
**Phase 3 Target**: [DATE]
**Phase 4 Target**: [DATE]
**Phase 5 Target**: [DATE]
**Phase 6 Target**: [DATE]
**Completion Target**: [DATE]

**Current Phase**: Phase 1, Step 1A (In Progress)
**Lines Reduced So Far**: 0 → Target: ~7500 lines
**Files Created**: 4/40+
**Completion**: 10%
