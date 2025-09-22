const canvas = document.querySelector("#renderCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const BOARD_HEIGHT = 720;
const BOARD_WIDTH = 1280;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 25;
const BALL_HEIGHT = 25;
const BALL_WIDTH = 25;

canvas.height = BOARD_HEIGHT;
canvas.width = BOARD_WIDTH;
canvas.style.backgroundColor = "black";

requestAnimationFrame(update);

interface Coordinate {
  x: number;
  y: number;
  width: number;
  height: number;
}

let ball = {
  x: canvas.width / 2 - BALL_WIDTH,
  y: canvas.height / 2 - BALL_HEIGHT,
  width: BALL_WIDTH,
  height: BALL_HEIGHT,
  velocity: { x: 2, y: 1 },
};

let paddle1 = {
  x: 16,
  y: canvas.height / 2 - PADDLE_HEIGHT,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  velocityY: 0,
};

let paddle2 = {
  x: canvas.width - PADDLE_WIDTH - 16,
  y: canvas.height / 2 - PADDLE_HEIGHT,
  width: PADDLE_WIDTH,
  height: PADDLE_HEIGHT,
  velocityY: 0,
};

function detectCollision(a: Coordinate, b: Coordinate) {
  return (
    a.x < b.x + b.width && //a's top left corner doesn't reach b's top right corner
    a.x + a.width > b.x && //a's top right corner passes b's top left corner
    a.y < b.y + b.height && //a's top left corner doesn't reach b's bottom left corner
    a.y + a.height > b.y
  ); //a's bottom left corner passes b's top left corner
}

function update() {
  ctx.clearRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, 1);
  ctx.fillRect(0, canvas.height - 1, canvas.width, 1);

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
  ball.x += ball.velocity.x;
  ball.y += ball.velocity.y;
  if (ball.y <= 0 || ball.y + ball.height >= canvas.height) {
    // if ball touches top or bottom of canvas
    ball.velocity.y *= -1; //reverse direction
  }
  if (detectCollision(ball, paddle1)) {
    if (ball.x <= paddle1.x + paddle1.width) {
      //left side of ball touches right side of paddle 1 (left paddle)
      ball.velocity.x *= -1; // flip x direction
    }
  } else if (detectCollision(ball, paddle2)) {
    if (ball.x + ball.width >= paddle2.x) {
      //right side of ball touches left side of paddle 2 (right paddle)
      ball.velocity.x *= -1; // flip x direction
    }
  }
  if (ball.x + ball.velocity.x >= canvas.width) {
    ball.x = canvas.width / 2 - ball.width;
    ball.y = canvas.height / 2 - ball.height;
  } else if (ball.x + ball.velocity.x <= 0) {
    ball.x = canvas.width / 2 - ball.width;
    ball.y = canvas.height / 2 - ball.height;
  }
  ctx.fillRect(
    (ball.x += ball.velocity.x),
    (ball.y += ball.velocity.y),
    ball.width,
    ball.height
  );
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
