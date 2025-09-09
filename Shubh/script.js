'use strict';

(function () {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const overlayEl = document.getElementById('overlay');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');

  /** Game constants */
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const BIRD_RADIUS = 14;
  const BIRD_X = Math.floor(WIDTH * 0.25);

  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150; // vertical gap
  const PIPE_INTERVAL_MS = 1400; // spawn cadence
  const PIPE_SPEED = 2.6; // px/frame

  const GROUND_THICKNESS = 0; // visual ground not drawn; we use canvas bounds

  /** Game state */
  let isRunning = false;
  let frameId = 0;
  let lastSpawnAt = 0;
  let mouseY = HEIGHT / 2;

  /** Bird state follows mouse with easing */
  const bird = {
    x: BIRD_X,
    y: HEIGHT / 2,
  };

  /** Pipes: array of { x, topHeight, gapStartY } */
  const pipes = [];

  let score = 0;

  function randBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resetGame() {
    isRunning = true;
    pipes.length = 0;
    score = 0;
    scoreEl.textContent = '0';
    lastSpawnAt = performance.now();
    mouseY = HEIGHT / 2;
    bird.y = HEIGHT / 2;
    overlayEl.hidden = true;
  }

  function endGame() {
    isRunning = false;
    finalScoreEl.textContent = String(score);
    overlayEl.hidden = false;
  }

  // Mouse tracking: set desired vertical position to cursor Y inside canvas bounds
  function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    mouseY = Math.max(BIRD_RADIUS, Math.min(HEIGHT - BIRD_RADIUS, y));
  }

  canvas.addEventListener('mousemove', handleMouseMove);

  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  // Pipe helpers
  function spawnPipe(nowTs) {
    // Choose a gap center with margins so the whole gap stays in-bounds
    const margin = 30;
    const gapCenter = randBetween(margin + PIPE_GAP / 2, HEIGHT - margin - PIPE_GAP / 2);

    pipes.push({
      x: WIDTH + 10,
      gapCenter,
      passed: false,
    });

    lastSpawnAt = nowTs;
  }

  function updatePipes() {
    for (let i = 0; i < pipes.length; i += 1) {
      pipes[i].x -= PIPE_SPEED;
    }

    // Remove offscreen pipes
    while (pipes.length && pipes[0].x + PIPE_WIDTH < 0) {
      pipes.shift();
    }
  }

  function drawBackground() {
    // Sky already set by CSS background, but we clear canvas for crisp draw
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Optional ground/top lines for collision cues
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(WIDTH, 1);
    ctx.moveTo(0, HEIGHT - 1 - GROUND_THICKNESS);
    ctx.lineTo(WIDTH, HEIGHT - 1 - GROUND_THICKNESS);
    ctx.stroke();
  }

  function drawBird() {
    // ease bird y towards mouseY
    const easing = 0.25; // higher = snappier
    bird.y += (mouseY - bird.y) * easing;

    // Body
    ctx.fillStyle = '#FFDC00';
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(bird.x + 4, bird.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#FF851B';
    ctx.beginPath();
    ctx.moveTo(bird.x + BIRD_RADIUS - 2, bird.y);
    ctx.lineTo(bird.x + BIRD_RADIUS + 10, bird.y - 4);
    ctx.lineTo(bird.x + BIRD_RADIUS + 10, bird.y + 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawPipesAndDetectCollision() {
    ctx.fillStyle = '#2ecc71';

    let collided = false;

    for (let i = 0; i < pipes.length; i += 1) {
      const p = pipes[i];
      const gapTop = p.gapCenter - PIPE_GAP / 2;
      const gapBottom = p.gapCenter + PIPE_GAP / 2;

      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_WIDTH, gapTop);
      // Bottom pipe
      ctx.fillRect(p.x, gapBottom, PIPE_WIDTH, HEIGHT - gapBottom);

      // Scoring: when bird center passes pipe's right edge
      if (!p.passed && bird.x > p.x + PIPE_WIDTH) {
        p.passed = true;
        score += 1;
        scoreEl.textContent = String(score);
      }

      // Collision check: circle-rect collision for both top and bottom parts
      // Check horizontal overlap first
      const birdLeft = bird.x - BIRD_RADIUS;
      const birdRight = bird.x + BIRD_RADIUS;
      const pipeLeft = p.x;
      const pipeRight = p.x + PIPE_WIDTH;

      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        // If bird y is not within gap range, it's a collision
        if (bird.y - BIRD_RADIUS < gapTop || bird.y + BIRD_RADIUS > gapBottom) {
          collided = true;
        }
      }
    }

    // Top/bottom bounds
    if (bird.y - BIRD_RADIUS <= 0 || bird.y + BIRD_RADIUS >= HEIGHT) {
      collided = true;
    }

    if (collided) {
      endGame();
    }
  }

  function loop(nowTs) {
    if (!isRunning) {
      return; // stop drawing while in overlay
    }

    // Spawn pipes at interval
    if (nowTs - lastSpawnAt >= PIPE_INTERVAL_MS) {
      spawnPipe(nowTs);
    }

    updatePipes();

    drawBackground();
    drawPipesAndDetectCollision();
    drawBird();

    frameId = requestAnimationFrame(loop);
  }

  // Start game on first interaction so mouse has a meaningful position
  function start() {
    if (isRunning) return;
    resetGame();
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(loop);
  }

  // Start immediately; user can move mouse to control
  start();
})();
