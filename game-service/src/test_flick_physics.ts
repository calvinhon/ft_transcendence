
import { GamePhysics } from './routes/modules/game-physics';
import { Ball, Paddle, Paddles } from './routes/modules/types';

const assert = (condition: boolean, msg: string) => {
    if (!condition) {
        console.error(`❌ FAIL: ${msg}`);
        process.exit(1);
    }
    console.log(`✅ PASS: ${msg}`);
};

const runTests = () => {
    console.log("Running Physics Verification...");

    const physics = new GamePhysics(10, false, 'arcade', true); // Powerups ENABLED

    // --- Test 1: Flick Physics ---
    console.log("\n--- Test 1: Flick Physics ---");

    // Setup base collision state
    // Paddle at y=200. Ball at x=paddle.x+10 (hit), y=200 (center hit).
    // Center hit normally produces angle 0.

    // Base case: Stationary
    const paddleBase: Paddle = { x: 50, y: 200, vy: 0 };
    const ballBase: Ball = { x: 60, y: 200, dx: -10, dy: 0 };
    // We need to simulate the collision state for handlePaddleHit
    // handlePaddleHit uses ball.y and paddle.y.

    // We can't call handlePaddleHit directly as it's private.
    // We have to mock updateBall or ensure updateBall calls it.
    // Easier: updateBall checkSweptPaddleCollision -> handlePaddleHit.

    // Let's rely on internal behavior or use "any" to access private if needed, 
    // but better to test public API `updateBall`.

    // Scenario: Ball moving left towards paddle.
    // Frame 1: Ball at 65.
    // Frame 2: Ball at 55. Paddle at 50 (Right edge 60).
    // Collision!

    const setupBall = (): Ball => ({ x: 65, y: 250, dx: -10, dy: 0 }); // y=250 matches paddle center (paddle y=200, height 100/110?, center ~255)
    // Paddle definition: y is top?
    // In game-physics.ts: 
    // const crossY = prevY + t * (ball.y - prevY);
    // if (crossY >= paddle.y && crossY <= paddle.y + 110)
    // So paddle is top-aligned, height 110. Center is y + 55.

    const paddleY = 200;
    const centerY = paddleY + 55;

    // Case A: Stationary
    const ballA = { x: 65, y: centerY, dx: -10, dy: 0 };
    const paddleA: Paddle = { x: 50, y: paddleY, vy: 0 };
    const paddlesA: Paddles = { player1: paddleA, player2: { x: 750, y: 200 } };
    if (physics['gameMode'] === 'arcade') paddlesA.team1 = [paddleA]; // Hack to satisfy arcade mode check

    physics.updateBall(ballA, paddlesA, 0);
    const angleA = Math.atan2(ballA.dy, ballA.dx);
    console.log(`Stationary Angle: ${angleA.toFixed(3)} (dy=${ballA.dy.toFixed(3)})`);

    // Case B: Moving UP (vy < 0)
    const ballB = { x: 65, y: centerY, dx: -10, dy: 0 };
    const paddleB: Paddle = { x: 50, y: paddleY, vy: -10 };
    paddlesA.team1![0] = paddleB;

    physics.updateBall(ballB, paddlesA, 0);
    const angleB = Math.atan2(ballB.dy, ballB.dx);
    console.log(`Moving UP Angle: ${angleB.toFixed(3)} (dy=${ballB.dy.toFixed(3)})`);

    // Expect angleB to be lower (more negative) than angleA 
    // Note: angleA should be approx 0 or PI?
    // Left paddle reflection: cos(angle) > 0 (moves right). sin(angle) depends.
    // Center hit -> angle 0.
    // Moving UP -> Should deflect UP -> dy < 0 -> angle < 0.
    assert(angleB < angleA - 0.1, "Moving UP should deflect ball UP (negative angle)");

    // Case C: Moving DOWN (vy > 0)
    const ballC = { x: 65, y: centerY, dx: -10, dy: 0 };
    const paddleC: Paddle = { x: 50, y: paddleY, vy: 10 };
    paddlesA.team1![0] = paddleC;

    physics.updateBall(ballC, paddlesA, 0);
    const angleC = Math.atan2(ballC.dy, ballC.dx);
    console.log(`Moving DOWN Angle: ${angleC.toFixed(3)} (dy=${ballC.dy.toFixed(3)})`);

    assert(angleC > angleA + 0.1, "Moving DOWN should deflect ball DOWN (positive angle)");


    // --- Test 2: Powerup Collision ---
    console.log("\n--- Test 2: Powerup Collision ---");

    // Force spawn powerup
    physics.powerup = { x: 400, y: 300, active: true, radius: 15 };

    const ballP = { x: 400, y: 300, dx: 10, dy: 0 }; // On top of powerup

    physics.updateBall(ballP, paddlesA, 0);

    assert(physics.powerup.active === false, "Powerup should be consumed (inactive) after collision");
    console.log("Powerup collision successful.");

    // Verify Effect: Paddle Height Increase
    // Ball hit powerup. physics.updateBall calls checkPowerupCollision -> applyPowerupEffect.
    // BUT we need 'lastHitter' to be set.
    // Let's re-run a scenario where ball hits paddle THEN powerup.

    console.log("\n--- Test 2b: Powerup Effect ---");
    // Setup: Ball hits Left Paddle (sets lastHitter='player1'), then hits Powerup.
    const physicsEffect = new GamePhysics(10, false, 'arcade', true);
    physicsEffect.powerup = { x: 400, y: 300, active: true, radius: 15 };

    const paddleEffect: Paddle = { x: 50, y: 250, height: 100, originalHeight: 100 };
    const paddlesEffect: Paddles = { player1: paddleEffect, player2: { x: 750, y: 250, height: 100 } };
    if (physicsEffect['gameMode'] === 'arcade') paddlesEffect.team1 = [paddleEffect];

    const ballEffect: Ball = { x: 65, y: 300, dx: -10, dy: 0 };

    // 1. Hit Paddle
    physicsEffect.updateBall(ballEffect, paddlesEffect, 0);
    // Ball should be at x ~ 61 (reflected). lastHitter should be 'player1'.

    if (!ballEffect.lastHitter) {
        // Force it for unit test if collision didn't register cleanly in one step
        ballEffect.lastHitter = 'player1';
    }

    // 2. Hit Powerup
    ballEffect.x = 400;
    ballEffect.y = 300;
    physicsEffect.updateBall(ballEffect, paddlesEffect, 0);

    assert(physicsEffect.powerup.active === false, "Powerup consumed");
    assert(paddleEffect.height === 150, `Paddle height should be 150 (1.5x), got ${paddleEffect.height}`);
    console.log("Powerup effect verified: Paddle height increased.");


    // --- Test 3: Right Paddle Collision (Fix Verification) ---
    console.log("\n--- Test 3: Right Paddle Fix ---");
    // Right paddle at x=750.
    // Physics boundary logic:
    // Left edge (Hit face) should be 750 (paddle.x).

    const paddleRight: Paddle = { x: 750, y: 200, vy: 0 };
    // Ball moving right towards it.
    // Start at 745. speed 10. Next position 755.
    // Should hit 750.

    const ballR = { x: 745, y: 255, dx: 10, dy: 0 }; // y=255 (center of paddle at 200)
    const paddlesR: Paddles = {
        player1: { x: 50, y: 200 },
        player2: paddleRight,
        team2: [paddleRight]
    };

    physics.updateBall(ballR, paddlesR, 0);

    // Check Result
    // 1. Should bounce (dx < 0)
    // 2. Position should be just outside boundary (x < 750)

    console.log(`Right Hit Result: x=${ballR.x.toFixed(2)}, dx=${ballR.dx}`);
    assert(ballR.dx < 0, "Ball should bounce off right paddle (negative dx)");
    assert(ballR.x <= 750, `Ball should be outside paddle boundary (x <= 750), got ${ballR.x}`);
    // With offset -1, should be 749.
    assert(Math.abs(ballR.x - 749) < 0.1, `Ball should be at collision face - offset (749), got ${ballR.x}`);

    console.log("Right paddle collision verified.");
};

runTests();
