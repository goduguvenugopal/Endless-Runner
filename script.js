const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('score-value');
const highScoreValue = document.getElementById('high-score-value');
const finalScoreValue = document.getElementById('final-score-value');
const gameOverElement = document.getElementById('gameOver');
const restartBtn = document.getElementById('restart-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboardModal');
const leaderboardList = document.getElementById('leaderboard-list');
const closeBtn = document.querySelector('.close-btn');

const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseModal = document.getElementById('pauseModal');

// Audio elements
const bgMusic = document.getElementById('bg-music');
const startSound = document.getElementById('start-sound');
const gameoverSound = document.getElementById('gameover-sound');
const jumpSound = document.getElementById('jump-sound');

// Game Constants
const GRAVITY = 0.7;
const JUMP_FORCE = -15;
let OBSTACLE_SPEED = 7;
const SPAWN_RATE = 80;

// Colors
const NEON_CYAN = '#00f2ff';
const NEON_MAGENTA = '#ff00ff';
const NEON_PURPLE = '#9d00ff';

// Game State Machine
const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
};
let gameState = STATE.MENU;

let player = {
    x: 100,
    y: 0,
    width: 40,
    height: 80,
    dy: 0,
    jumping: false,
    frame: 0
};

let obstacles = [];
let score = 0;
let frameCount = 0;
let groundY = 0;
let gridOffset = 0;

function resize() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    groundY = canvas.height * 0.75;
    if (gameState === STATE.MENU) {
        player.y = groundY - player.height;
    }
}

window.addEventListener('resize', resize);
resize();

// Leaderboard Logic
function saveScore(newScore) {
    let scores = JSON.parse(localStorage.getItem('kavex_runner_scores') || '[]');
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getFullYear()).slice(-2)}`;
    scores.push({ score: newScore, date: formattedDate });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5); 
    localStorage.setItem('kavex_runner_scores', JSON.stringify(scores));
    updateHighScoreDisplay();
}

function updateHighScoreDisplay() {
    const scores = JSON.parse(localStorage.getItem('kavex_runner_scores') || '[]');
    const best = scores.length > 0 ? scores[0].score : 0;
    highScoreValue.innerText = best;
}

function showLeaderboard() {
    if (gameState === STATE.PLAYING) togglePause();
    
    const scores = JSON.parse(localStorage.getItem('kavex_runner_scores') || '[]');
    leaderboardList.innerHTML = scores.map((s, i) => `
        <li>
            <span>#${i + 1} &nbsp; ${s.date}</span>
            <span style="color: ${NEON_MAGENTA}; font-weight: bold; margin-left: 20px;">${s.score} POINTS</span>
        </li>
    `).join('') || '<li>No scores yet!</li>';
    leaderboardModal.style.display = 'flex';
}

leaderboardBtn.addEventListener('click', showLeaderboard);
closeBtn.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
});

function init() {
    resize();
    player.dy = 0;
    player.jumping = false;
    player.frame = 0;
    player.y = groundY - player.height;
    obstacles = [];
    score = 0;
    frameCount = 0;
    OBSTACLE_SPEED = 7;
    gameState = STATE.PLAYING;
    gameOverElement.style.display = 'none';
    pauseModal.style.display = 'none';
    scoreValue.innerText = score;
    updateHighScoreDisplay();

    // Audio triggers
    console.log("Attempting to play start sound and bg music...");
    startSound.currentTime = 0;
    startSound.play()
        .then(() => console.log("Start sound playing"))
        .catch(e => console.error("Start sound error:", e));
    
    bgMusic.play()
        .then(() => console.log("Background music playing"))
        .catch(e => console.error("Background music error:", e));
}

function togglePause() {
    if (gameState === STATE.PLAYING) {
        gameState = STATE.PAUSED;
        pauseModal.style.display = 'flex';
        bgMusic.pause();
    } else if (gameState === STATE.PAUSED) {
        gameState = STATE.PLAYING;
        pauseModal.style.display = 'none';
        bgMusic.play().catch(() => {});
    }
}

pauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePause();
});
resumeBtn.addEventListener('click', togglePause);

function handleInput(e) {
    if (e && e.preventDefault && e.type !== 'keydown') e.preventDefault();

    if (gameState === STATE.MENU || gameState === STATE.GAMEOVER) {
        init();
        return;
    }

    if (gameState === STATE.PAUSED) {
        togglePause();
        return;
    }

    if (gameState === STATE.PLAYING && !player.jumping) {
        player.dy = JUMP_FORCE;
        player.jumping = true;
        
        // Jump sound
        jumpSound.currentTime = 0;
        jumpSound.play().catch(() => {});
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleInput(e);
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});

canvas.addEventListener('touchstart', handleInput, { passive: false });
canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) handleInput(e);
});

restartBtn.addEventListener('click', init);

function spawnObstacle() {
    const type = Math.random() > 0.5 ? 'tall' : 'wide';
    let width, height;
    
    if (type === 'tall') {
        width = 30;
        height = 70 + Math.random() * 30;
    } else {
        width = 60 + Math.random() * 30;
        height = 40;
    }

    obstacles.push({
        x: canvas.width,
        y: groundY - height,
        width: width,
        height: height,
        type: type,
        color: Math.random() > 0.5 ? NEON_CYAN : NEON_MAGENTA
    });
}

function update() {
    if (gameState !== STATE.PLAYING) return;

    // Player Physics
    player.dy += GRAVITY;
    player.y += player.dy;

    if (player.y + player.height > groundY) {
        player.y = groundY - player.height;
        player.dy = 0;
        player.jumping = false;
        player.frame += 0.15;
    }

    // Grid Scroll
    gridOffset = (gridOffset + OBSTACLE_SPEED) % 40;

    // Difficulty scaling
    OBSTACLE_SPEED += 0.001;

    // Obstacle Logic
    frameCount++;
    if (frameCount % SPAWN_RATE === 0) {
        spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED;

        // Collision Detection
        const px = player.x + 10;
        const py = player.y + 5;
        const pw = player.width - 20;
        const ph = player.height - 10;

        if (
            px < obstacles[i].x + obstacles[i].width &&
            px + pw > obstacles[i].x &&
            py < obstacles[i].y + obstacles[i].height &&
            py + ph > obstacles[i].y
        ) {
            gameState = STATE.GAMEOVER;
            saveScore(score);
            finalScoreValue.innerText = score;
            gameOverElement.style.display = 'flex';
            
            // Audio triggers
            bgMusic.pause();
            bgMusic.currentTime = 0;
            gameoverSound.currentTime = 0;
            gameoverSound.play().catch(() => {});
        }

        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
            scoreValue.innerText = score;
        }
    }
}

function drawPlayer(x, y) {
    ctx.save();
    ctx.translate(x, y);

    const runCycle = player.frame * 2;
    const limbSwing = Math.sin(runCycle);
    
    ctx.shadowBlur = 15;
    ctx.shadowColor = NEON_CYAN;
    ctx.strokeStyle = NEON_CYAN;
    ctx.lineWidth = 3;

    // Humanoid Body Shape
    // Torso
    ctx.beginPath();
    ctx.moveTo(20, 25);
    ctx.lineTo(20, 50);
    ctx.stroke();

    // Head (Visor Style)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.roundRect(10, 5, 20, 20, 5);
    ctx.fill();
    ctx.stroke();
    
    // Glowing Visor
    ctx.shadowBlur = 10;
    ctx.shadowColor = NEON_MAGENTA;
    ctx.fillStyle = NEON_MAGENTA;
    ctx.fillRect(15, 12, 12, 3);

    // Arms
    ctx.shadowColor = NEON_CYAN;
    ctx.beginPath();
    // Arm 1
    ctx.moveTo(20, 30);
    ctx.lineTo(20 + limbSwing * 15, 45);
    // Arm 2
    ctx.moveTo(20, 30);
    ctx.lineTo(20 - limbSwing * 15, 45);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    // Leg 1
    ctx.moveTo(20, 50);
    ctx.lineTo(20 + limbSwing * 20, 80);
    // Leg 2
    ctx.moveTo(20, 50);
    ctx.lineTo(20 - limbSwing * 20, 80);
    ctx.stroke();

    ctx.restore();
}

function drawObstacle(obs) {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = obs.color;
    ctx.strokeStyle = obs.color;
    ctx.lineWidth = 3;
    
    // Neon Barricade Look
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    
    // Interior Detail
    ctx.lineWidth = 1;
    for(let i = 0; i < obs.width; i += 10) {
        ctx.beginPath();
        ctx.moveTo(obs.x + i, obs.y);
        ctx.lineTo(obs.x + i, obs.y + obs.height);
        ctx.stroke();
    }

    ctx.restore();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
    ctx.lineWidth = 1;

    // Vertical lines (perspective)
    for (let i = -200; i < canvas.width + 200; i += 40) {
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, groundY - 50);
        ctx.lineTo(i - gridOffset, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines
    for (let i = groundY; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

function draw() {
    // Clear with dark fade
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Neon Horizon
    const grad = ctx.createLinearGradient(0, groundY, 0, groundY + 5);
    grad.addColorStop(0, NEON_PURPLE);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, canvas.width, 5);

    drawGrid();
    drawPlayer(player.x, player.y);

    for (const obstacle of obstacles) {
        drawObstacle(obstacle);
    }
    
    if (gameState === STATE.MENU) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = NEON_CYAN;
        ctx.fillStyle = NEON_CYAN;
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('KAVEX RUNNER', canvas.width/2, canvas.height/2 - 40);
        
        ctx.font = '18px sans-serif';
        ctx.fillText('TAP TO START', canvas.width/2, canvas.height/2 + 20);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start
updateHighScoreDisplay();
gameLoop();
