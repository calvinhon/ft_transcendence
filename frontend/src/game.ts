const canvas = document.querySelector("#renderCanvas") as HTMLCanvasElement;

const BOARD_HEIGHT = 720;
const BOARD_WIDTH = 1280;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 25;
const PADDLE_SPEED = 5;
const BALL_HEIGHT = 25;
const BALL_WIDTH = 25;
const WINNING_SCORE = 5;
const FONT_FAMILY = "Workbench";
const FONT_SIZE = 128;
const PADDING = 36;
const COUNTDOWN_DURATION = 3; // seconds

canvas.height = BOARD_HEIGHT;
canvas.width = BOARD_WIDTH;
canvas.style.backgroundColor = "black";

enum States {
  NOT_STARTED,
  COUNTDOWN,
  IN_PROGRESS,
  FINISHED,
}

/**
 * Player paddle that holds the player's:
 * - Score
 * - Position
 * - Velocity
 * TODO: Update to include player name as well
 */
class Player {
  score = 0;
  position = { x: 0, y: 0 };
  initialPos: { x: number; y: number };
  velocity = { x: 0, y: 0 };
  height: number = PADDLE_HEIGHT;
  width: number = PADDLE_WIDTH;

  constructor(position: { x: number; y: number }) {
    this.position = position;
    this.initialPos = position;
  }

  reset() {
    this.position = this.initialPos;
  }

  getNextPos(): { x: number; y: number } {
    return {
      x: this.position.x + this.velocity.x,
      y: this.position.y + this.velocity.y,
    };
  }

  // Check if the paddle will be within the bounds after moving
  isWithinBounds(boundaryTop: number, boundaryBottom: number): boolean {
    let newPos = this.getNextPos().y;
    return newPos >= boundaryTop && newPos <= boundaryBottom - this.height;
  }

  updatePosition(canvasEl: HTMLCanvasElement) {
    if (this.isWithinBounds(0, canvasEl.height))
      this.position = this.getNextPos();
  }

  drawOnCanvas(canvasContext: CanvasRenderingContext2D) {
    canvasContext.fillRect(
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );
  }
}

/**
 * Ball class that holds the ball's:
 * - Position
 * - Velocity
 *
 * Takes modifiers in the constructor for optional powerups
 */
class Ball {
  position = { x: 0, y: 0 };
  initialPosition: { x: number; y: number };
  velocity = { x: 2, y: 1 };
  height: number = BALL_HEIGHT;
  width: number = BALL_WIDTH;
  #speed: number;
  exitedLeftBoundary: CustomEvent<{ side: "left" }>;
  exitedRightBoundary: CustomEvent<{ side: "right" }>;

  constructor(position: { x: number; y: number }, speed: number = 1) {
    this.position = { ...position }; // copy by value
    this.initialPosition = { ...position };
    this.#speed = speed;
    this.exitedLeftBoundary = new CustomEvent("exitedBounds", {
      detail: { side: "left" },
    });
    this.exitedRightBoundary = new CustomEvent("exitedBounds", {
      detail: { side: "right" },
    });
  }

  updatePosition(canvasEl: HTMLCanvasElement) {
    // use #speed when moving the ball
    this.position.x += this.velocity.x * this.#speed;
    this.position.y += this.velocity.y * this.#speed;

    const w = canvasEl.width || window.innerWidth;
    const h = canvasEl.height || window.innerHeight;

    // bounce top/bottom
    if (this.position.y <= 0 || this.position.y + this.height >= h) {
      this.velocity.y *= -1;
    }

    // left / right exit checks — dispatch global events
    if (this.position.x + this.width / 2 < 0) {
      document.dispatchEvent(this.exitedLeftBoundary);
    } else if (this.position.x - this.width / 2 > w) {
      document.dispatchEvent(this.exitedRightBoundary);
    }
  }

  reset() {
    this.position = { ...this.initialPosition };
    this.velocity.x = 2;
    this.velocity.y = 1;
  }
}

/**
 * Game class that holds the variables:
 * - Paddles
 * - Ball
 * - Game State
 *
 * And the methods to:
 * - Start the game
 * - Reset the board
 */
class Game {
  player1: Player;
  player2: Player;
  ball: Ball;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: States = States.NOT_STARTED;
  winningPlayer: Player | undefined = undefined;
  private countdownValue: number = COUNTDOWN_DURATION;
  private lastCountdownTime: number = 0;

  constructor(canvasEl: HTMLCanvasElement) {
    this.player1 = new Player({
      x: 16,
      y: canvasEl.height / 2 - PADDLE_HEIGHT / 2,
    });
    this.player2 = new Player({
      x: canvasEl.width - PADDLE_WIDTH - 16,
      y: canvasEl.height / 2 - PADDLE_HEIGHT / 2,
    });
    this.ball = new Ball({
      x: canvasEl.width / 2 - BALL_WIDTH / 2,
      y: canvasEl.height / 2 - BALL_HEIGHT / 2,
    });
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext("2d") as CanvasRenderingContext2D;
    this.ctx.fillStyle = "white";
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));
    document.addEventListener("exitedBounds", this.handleBallExit.bind(this));
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (this.state !== States.IN_PROGRESS) return;

    switch (e.code) {
      case "KeyW":
        this.player1.velocity.y = -PADDLE_SPEED;
        break;
      case "KeyS":
        this.player1.velocity.y = PADDLE_SPEED;
        break;
      case "ArrowUp":
        this.player2.velocity.y = -PADDLE_SPEED;
        break;
      case "ArrowDown":
        this.player2.velocity.y = PADDLE_SPEED;
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    switch (e.code) {
      case "KeyW":
      case "KeyS":
        this.player1.velocity.y = 0;
        break;
      case "ArrowUp":
      case "ArrowDown":
        this.player2.velocity.y = 0;
        break;
    }
  };

  private handleBallExit = (e: Event): void => {
    const ce = e as CustomEvent<{ side: "left" | "right" }>;

    if (ce.detail.side === "left") {
      this.player2.score++;
    } else {
      this.player1.score++;
    }

    this.checkWinCondition();
    if (this.state === States.IN_PROGRESS) {
      this.startCountdown();
    }
  };

  private checkWinCondition(): void {
    if (this.player1.score >= WINNING_SCORE) {
      this.#triggerWin(this.player1);
    } else if (this.player2.score >= WINNING_SCORE) {
      this.#triggerWin(this.player2);
    }
  }

  private startCountdown(): void {
    this.state = States.COUNTDOWN;
    this.countdownValue = COUNTDOWN_DURATION;
    this.lastCountdownTime = performance.now();
    this.reset();
  }

  private drawCountdown(): void {
    const now = performance.now();
    if (now - this.lastCountdownTime >= 1000) {
      this.countdownValue--;
      this.lastCountdownTime = now;

      if (this.countdownValue <= 0) {
        this.state = States.IN_PROGRESS;
        return;
      }
    }

    this.ctx.fillStyle = "white";
    this.ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      this.countdownValue.toString(),
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  private drawWinScreen(): void {
    this.ctx.fillStyle = "white";
    this.ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      `Player ${this.winningPlayer === this.player1 ? "1" : "2"} Wins!`,
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  detectCollision(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) {
    return (
      a.x < b.x + b.width && //a's top left corner doesn't reach b's top right corner
      a.x + a.width > b.x && //a's top right corner passes b's top left corner
      a.y < b.y + b.height && //a's top left corner doesn't reach b's bottom left corner
      a.y + a.height > b.y
    ); //a's bottom left corner passes b's top left corner
  }

  reset() {
    this.ball.reset();
    this.player1.reset();
    this.player2.reset();
  }

  #triggerWin(player: Player) {
    this.state = States.FINISHED;
    this.winningPlayer = player;
  }

  #draw = () => {
    // Clear and draw background
    this.ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
    this.drawBackground();

    // Draw scores
    this.drawScores();

    this.player1.drawOnCanvas(this.ctx);
    this.player2.drawOnCanvas(this.ctx);

    if (this.state === States.FINISHED) {
      this.drawWinScreen();
    } else if (this.state === States.COUNTDOWN) {
      this.drawCountdown();
    } else if (this.state === States.IN_PROGRESS) {
      // Update game objects
      this.player1.updatePosition(this.canvas);
      this.player2.updatePosition(this.canvas);
      this.ball.updatePosition(this.canvas);

      // Check for paddle collisions
      const ballRect = {
        x: this.ball.position.x,
        y: this.ball.position.y,
        width: this.ball.width,
        height: this.ball.height,
      };

      const player1Rect = {
        x: this.player1.position.x,
        y: this.player1.position.y,
        width: this.player1.width,
        height: this.player1.height,
      };

      const player2Rect = {
        x: this.player2.position.x,
        y: this.player2.position.y,
        width: this.player2.width,
        height: this.player2.height,
      };

      // Player 1 paddle collision (left paddle)
      if (this.detectCollision(ballRect, player1Rect)) {
        // Only bounce if ball hits the front face of the paddle
        if (
          this.ball.velocity.x < 0 &&
          this.ball.position.x > this.player1.position.x
        ) {
          this.ball.velocity.x *= -1;
          // Ensure ball doesn't get stuck in paddle
          this.ball.position.x = this.player1.position.x + this.player1.width;
        }
      }
      // Player 2 paddle collision (right paddle)
      else if (this.detectCollision(ballRect, player2Rect)) {
        // Only bounce if ball hits the front face of the paddle
        if (
          this.ball.velocity.x > 0 &&
          this.ball.position.x + this.ball.width <
            this.player2.position.x + this.player2.width
        ) {
          this.ball.velocity.x *= -1;
          // Ensure ball doesn't get stuck in paddle
          this.ball.position.x = this.player2.position.x - this.ball.width;
        }
      }

      // Ball Draw
      this.ctx.fillRect(
        this.ball.position.x,
        this.ball.position.y,
        this.ball.width,
        this.ball.height
      );
    }

    requestAnimationFrame(this.#draw);
  };

  private drawBackground(): void {
    this.ctx.strokeStyle = "rgba(49, 49, 49, 1)";
    // Top Stroke
    this.ctx.fillRect(0, 0, this.canvas.width, 1);
    // Bottom Stroke
    this.ctx.fillRect(0, this.canvas.height - 1, this.canvas.width, 1);
    // Center Line
    this.ctx.setLineDash([8, 8]);
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2 - 0, 1);
    this.ctx.lineTo(this.canvas.width / 2 - 0, this.canvas.height);
    this.ctx.stroke();
  }

  private drawScores(): void {
    this.ctx.fillStyle = "rgba(49, 49, 49, 1)";
    this.ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      this.player1.score.toString(),
      this.canvas.width / 4,
      FONT_SIZE + PADDING
    );
    this.ctx.fillText(
      this.player2.score.toString(),
      (3 * this.canvas.width) / 4,
      FONT_SIZE + PADDING
    );
    this.ctx.fillStyle = "white";
  }

  // Start the game
  start(): void {
    this.startCountdown();
    requestAnimationFrame(this.#draw);
  }
}

let game = new Game(canvas);

game.start();

export default { canvas };
