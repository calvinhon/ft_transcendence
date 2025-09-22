const canvas = document.querySelector("#renderCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const BOARD_HEIGHT = 720;
const BOARD_WIDTH = 1280;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 25;
const BALL_HEIGHT = 25;
const BALL_WIDTH = 25;

let p1Score = 0;
let p2Score = 0;

canvas.height = BOARD_HEIGHT;
canvas.width = BOARD_WIDTH;
canvas.style.backgroundColor = "black";

requestAnimationFrame(update);

interface CanvasShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

let ball = {
  x: canvas.width / 2 - BALL_WIDTH / 2,
  y: canvas.height / 2 - BALL_HEIGHT / 2,
  width: BALL_WIDTH,
  height: BALL_HEIGHT,
  velocity: { x: 2, y: 1 },
};

let paddle1 = {
  x: 16,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  velocityY: 0,
};

let paddle2 = {
  x: canvas.width - PADDLE_WIDTH - 16,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  velocityY: 0,
};

function detectCollision(a: CanvasShape, b: CanvasShape) {
  return (
    a.x < b.x + b.width && //a's top left corner doesn't reach b's top right corner
    a.x + a.width > b.x && //a's top right corner passes b's top left corner
    a.y < b.y + b.height && //a's top left corner doesn't reach b's bottom left corner
    a.y + a.height > b.y
  ); //a's bottom left corner passes b's top left corner
}

function update() {
  // Remove previous content
  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  ctx.fillStyle = "white";

  // Top Stroke
  ctx.fillRect(0, 0, canvas.width, 1);

  // Bottom Stroke
  ctx.fillRect(0, canvas.height - 1, canvas.width, 1);

  // Center Line
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = "white";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 1, 0);
  ctx.lineTo(canvas.width / 2 - 1, canvas.height);
  ctx.stroke();

  // Paddles
  let p1NewPos = {
    x: paddle1.x,
    y: paddle1.y + paddle1.velocityY,
  };
  let p2NewPos = {
    x: paddle2.x,
    y: paddle2.y + paddle2.velocityY,
  };
  if (p1NewPos.y >= 0 && p1NewPos.y <= canvas.height - paddle1.height)
    ctx.fillRect(
      paddle1.x,
      (paddle1.y += paddle1.velocityY),
      paddle1.width,
      paddle1.height
    );
  else ctx.fillRect(paddle1.x, paddle1.y, paddle1.width, paddle1.height);
  if (p2NewPos.y >= 0 && p2NewPos.y <= canvas.height - paddle2.height)
    ctx.fillRect(
      paddle2.x,
      (paddle2.y += paddle2.velocityY),
      paddle2.width,
      paddle2.height
    );
  else ctx.fillRect(paddle2.x, paddle2.y, paddle2.width, paddle2.height);

  // Ball Collision
  ball.x += ball.velocity.x;
  ball.y += ball.velocity.y;
  if (ball.y <= 0 || ball.y + ball.height >= canvas.height) {
    ball.velocity.y *= -1;
  }
  if (detectCollision(ball, paddle1)) {
    if (ball.x <= paddle1.x + paddle1.width) {
      ball.velocity.x *= -1;
    }
  } else if (detectCollision(ball, paddle2)) {
    if (ball.x + ball.width >= paddle2.x) {
      ball.velocity.x *= -1;
    }
  }

  // TODO: Update reset logic
  if (ball.x + ball.velocity.x >= canvas.width) {
    // Manual Reset
    ball.x = canvas.width / 2 - ball.width / 2;
    ball.y = canvas.height / 2 - ball.height / 2;
    ball.velocity.x = 2;
    ball.velocity.y = 1;
    p1Score++;
  } else if (ball.x + ball.velocity.x <= 0) {
    // Manual Reset
    ball.x = canvas.width / 2 - ball.width / 2;
    ball.y = canvas.height / 2 - ball.height / 2;
    ball.velocity.x = -2;
    ball.velocity.y = 1;
    p2Score++;
  }

  // Ball Draw
  ctx.fillRect(
    (ball.x += ball.velocity.x),
    (ball.y += ball.velocity.y),
    ball.width,
    ball.height
  );

  // Score
  const FONT_SIZE = 128;
  const PADDING = 36;
  ctx.fillStyle = "rgba(49, 49, 49, 1)";
  ctx.font = `${FONT_SIZE}px Workbench`;
  ctx.fillText(p1Score.toString(), canvas.width / 4, FONT_SIZE + PADDING);
  ctx.fillText(p2Score.toString(), (3 * canvas.width) / 4, FONT_SIZE + PADDING);

  if (p1Score >= 5 || p2Score >= 5) return;
  // Draw again next frame
  requestAnimationFrame(update);
}

document.addEventListener("keydown", (e) => {
  if (e.code == "KeyW") paddle1.velocityY = -4;
  else if (e.code == "KeyS") paddle1.velocityY = 4;
  else if (e.code == "ArrowUp") paddle2.velocityY = -4;
  else if (e.code == "ArrowDown") paddle2.velocityY = 4;
});

document.addEventListener("keyup", (e) => {
  if (e.code == "KeyW" || e.code == "KeyS") paddle1.velocityY = 0;
  else if (e.code == "ArrowUp" || e.code == "ArrowDown") paddle2.velocityY = 0;
});

export default { canvas };
