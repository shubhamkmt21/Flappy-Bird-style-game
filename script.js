'use strict';

(function () {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const overlayEl = document.getElementById('overlay');
  const finalScoreEl = document.getElementById('finalScore');
  const restartBtn = document.getElementById('restartBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');

  /** Game constants */
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  const BIRD_RADIUS = 14;
  const BIRD_X = Math.floor(WIDTH * 0.25);

  const PIPE_WIDTH = 60;
  const PIPE_GAP = 150; // vertical gap
  const PIPE_INTERVAL_MS = 1400; // spawn cadence
  const PIPE_SPEED = 2.6; // px/frame

  const MOVE_SPEED = 4.0; // bird pixels per frame on key hold

  /** Game state */
  let isRunning = false; // gameplay active (not game over)
  let isPaused = false;  // paused state
  let frameId = 0;
  let lastSpawnAt = 0;

  /** Bird state controlled by arrows */
  const bird = {
    x: BIRD_X,
    y: HEIGHT / 2,
  };

  /** Pipes: array of { x, gapCenter, passed } */
  const pipes = [];

  let score = 0;
  let best = 0;

  // Load best score from localStorage
  try {
    const saved = localStorage.getItem('flappy_best');
    if (saved) best = Number(saved) || 0;
  } catch (_) {}
  bestEl && (bestEl.textContent = String(best));

  // Input handling (ArrowUp / ArrowDown)
  let directionY = 0; // -1 up, +1 down, 0 idle

  function onKeyDown(e) {
    if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      directionY = -1;
    } else if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      directionY = +1;
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePause();
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      resetGame();
    }
  }

  function onKeyUp(e) {
    if (e.key === 'ArrowUp' || e.key === 'Up') {
      e.preventDefault();
      if (directionY === -1) directionY = 0;
    } else if (e.key === 'ArrowDown' || e.key === 'Down') {
      e.preventDefault();
      if (directionY === +1) directionY = 0;
    }
  }

  window.addEventListener('keydown', onKeyDown, { passive: false });
  window.addEventListener('keyup', onKeyUp, { passive: false });

  // Buttons
  pauseBtn?.addEventListener('click', () => togglePause());
  resetBtn?.addEventListener('click', () => resetGame());
  restartBtn.addEventListener('click', () => {
    resetGame();
  });

  function setPauseUI() {
    if (!pauseBtn) return;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(isPaused));
  }

  function togglePause() {
    if (!isRunning) return; // cannot pause on game over
    isPaused = !isPaused;
    setPauseUI();
    if (!isPaused) {
      // resume loop immediately
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(loop);
    }
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function randBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resetGame() {
    isRunning = true;
    isPaused = false;
    setPauseUI();

    pipes.length = 0;
    score = 0;
    scoreEl.textContent = '0';
    lastSpawnAt = performance.now();
    bird.y = HEIGHT / 2;
    directionY = 0;
    overlayEl.hidden = true;

    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(loop);
  }

  function endGame() {
    isRunning = false;
    isPaused = false;
    setPauseUI();

    // update best
    if (score > best) {
      best = score;
      try { localStorage.setItem('flappy_best', String(best)); } catch (_) {}
      bestEl && (bestEl.textContent = String(best));
    }

    finalScoreEl.textContent = String(score);
    overlayEl.hidden = false;
  }

  // Pipe helpers
  function spawnPipe(nowTs) {
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

    while (pipes.length && pipes[0].x + PIPE_WIDTH < 0) {
      pipes.shift();
    }
  }

  function drawBackground() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Border lines (professional framing)
    ctx.strokeStyle = 'rgba(16,42,67,0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, WIDTH - 2, HEIGHT - 2);

    // Subtle top/bottom helpers
    ctx.strokeStyle = 'rgba(16,42,67,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 60);
    ctx.lineTo(WIDTH, 60);
    ctx.moveTo(0, HEIGHT - 60);
    ctx.lineTo(WIDTH, HEIGHT - 60);
    ctx.stroke();
  }

  function updateBird() {
    if (directionY !== 0) {
      bird.y += MOVE_SPEED * directionY;
      bird.y = clamp(bird.y, BIRD_RADIUS, HEIGHT - BIRD_RADIUS);
    }
  }

  function drawBird() {
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

      if (!p.passed && bird.x > p.x + PIPE_WIDTH) {
        p.passed = true;
        score += 1;
        scoreEl.textContent = String(score);
      }

      // Collision check
      const birdLeft = bird.x - BIRD_RADIUS;
      const birdRight = bird.x + BIRD_RADIUS;
      const pipeLeft = p.x;
      const pipeRight = p.x + PIPE_WIDTH;

      if (birdRight > pipeLeft && birdLeft < pipeRight) {
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
    if (!isRunning) return;
    if (isPaused) {
      // When paused, draw frame without updating world
      drawBackground();
      drawPipesAndDetectCollision(); // draws pipes only; early return prevents endGame triggers
      drawBird();
      frameId = requestAnimationFrame(loop);
      return;
    }

    // Spawn pipes at interval
    if (nowTs - lastSpawnAt >= PIPE_INTERVAL_MS) {
      spawnPipe(nowTs);
    }

    updatePipes();
    updateBird();

    drawBackground();
    drawPipesAndDetectCollision();
    drawBird();

    frameId = requestAnimationFrame(loop);
  }

  function start() {
    if (isRunning) return;
    resetGame();
  }

  // Kick off
  start();
})();
