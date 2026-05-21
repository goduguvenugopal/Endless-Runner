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

// Game Constants
const GRAVITY = 0.6;
const JUMP_FORCE = -16;
let OBSTACLE_SPEED = 6;
const SPAWN_RATE = 90;

// Game State
let player = {
    x: 50,
    y: 0,
    width: 35,
    height: 70,
    dy: 0,
    jumping: false,
    frame: 0
};

let obstacles = [];
let score = 0;
let frameCount = 0;
let gameActive = false; // Start inactive for menu
let groundY = 0;

function resize() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    groundY = canvas.height * 0.7;
    player.y = groundY - player.height;
}

window.addEventListener('resize', resize);
resize();

// Leaderboard Logic
function saveScore(newScore) {
    let scores = JSON.parse(localStorage.getItem('equestrian_scores') || '[]');
    scores.push({ score: newScore, date: new Date().toLocaleDateString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5); // Keep top 5
    localStorage.setItem('equestrian_scores', JSON.stringify(scores));
    updateHighScoreDisplay();
}

function updateHighScoreDisplay() {
    const scores = JSON.parse(localStorage.getItem('equestrian_scores') || '[]');
    const best = scores.length > 0 ? scores[0].score : 0;
    highScoreValue.innerText = best;
}

function showLeaderboard() {
    gameActive = false; // Pause game
    const scores = JSON.parse(localStorage.getItem('equestrian_scores') || '[]');
    leaderboardList.innerHTML = scores.map((s, i) => `
        <li>
            <span>#${i + 1} - ${s.date}</span>
            <span style="color: #e94560; font-weight: bold;">${s.score}</span>
        </li>
    `).join('') || '<li>No scores yet!</li>';
    leaderboardModal.style.display = 'flex';
}

leaderboardBtn.addEventListener('click', showLeaderboard);
closeBtn.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
    // Only resume if we weren't in a game over state
    if (gameOverElement.style.display !== 'flex') {
        draw(); // Ensure one frame is drawn to show state
    }
});

function init() {
    resize();
    player.dy = 0;
    player.jumping = false;
    player.frame = 0;
    obstacles = [];
    score = 0;
    frameCount = 0;
    OBSTACLE_SPEED = 6;
    gameActive = true;
    gameOverElement.style.display = 'none';
    scoreValue.innerText = score;
    updateHighScoreDisplay();
    requestAnimationFrame(gameLoop);
}

function handleInput(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!gameActive && gameOverElement.style.display === 'flex') {
        init();
        return;
    }
    if (!gameActive && !leaderboardModal.style.display === 'flex') {
        init();
        return;
    }
    if (player.y > groundY - player.height - 5) { // Simple floor check
        player.dy = JUMP_FORCE;
        player.jumping = true;
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') handleInput(e);
});

canvas.addEventListener('touchstart', (e) => {
    if (!gameActive && gameOverElement.style.display !== 'flex') {
        init();
    } else {
        handleInput(e);
    }
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
        if (!gameActive && gameOverElement.style.display !== 'flex') {
            init();
        } else {
            handleInput(e);
        }
    }
});

restartBtn.addEventListener('click', init);

function spawnObstacle() {
    const type = Math.random() > 0.5 ? 'tree' : 'stone';
    let width, height;
    
    if (type === 'tree') {
        width = 40;
        height = 60 + Math.random() * 40;
    } else {
        width = 40 + Math.random() * 20;
        height = 30 + Math.random() * 10;
    }

    obstacles.push({
        x: canvas.width,
        y: groundY - height,
        width: width,
        height: height,
        type: type
    });
}

function update() {
    if (!gameActive) return;

    // Player Physics
    player.dy += GRAVITY;
    player.y += player.dy;

    if (player.y + player.height > groundY) {
        player.y = groundY - player.height;
        player.dy = 0;
        player.jumping = false;
        player.frame += 0.15;
    }

    // Difficulty scaling
    if (score > 0 && score % 10 === 0) {
        OBSTACLE_SPEED += 0.002; 
    }

    // Obstacle Logic
    frameCount++;
    if (frameCount % SPAWN_RATE === 0) {
        spawnObstacle();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= OBSTACLE_SPEED;

        // Collision Detection (Hitbox refinement)
        const px = player.x + 10;
        const py = player.y + 10;
        const pw = player.width - 20;
        const ph = player.height - 15;

        if (
            px < obstacles[i].x + obstacles[i].width - 5 &&
            px + pw > obstacles[i].x + 5 &&
            py < obstacles[i].y + obstacles[i].height &&
            py + ph > obstacles[i].y
        ) {
            gameActive = false;
            saveScore(score);
            finalScoreValue.innerText = score;
            gameOverElement.style.display = 'flex';
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
    const bounce = Math.abs(Math.cos(runCycle)) * 4;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(17, player.height + 5, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Back Limbs
    ctx.strokeStyle = '#2980b9';
    ctx.beginPath();
    ctx.moveTo(17, 45);
    ctx.lineTo(17 - limbSwing * 15, 55);
    ctx.lineTo(17 - limbSwing * 20, 70);
    ctx.stroke();

    ctx.strokeStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(17, 25);
    ctx.lineTo(17 + limbSwing * 12, 35);
    ctx.lineTo(17 + limbSwing * 18, 25);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(8, 20 - bounce, 18, 28, 8);
    ctx.fill();

    // Head Details
    const headY = 12 - bounce;
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(14, 18 - bounce, 6, 5); // Neck
    ctx.beginPath();
    ctx.arc(17, headY, 11, 0, Math.PI * 2); // Head
    ctx.fill();

    // Eyes & Face
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(21, headY - 2, 3, 0, Math.PI * 2);
    ctx.arc(13, headY - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(22, headY - 2, 1.2, 0, Math.PI * 2);
    ctx.arc(14, headY - 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(17, headY + 4, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Hat
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(17, headY - 2, 11, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(17, headY - 4, 16, 3);

    // Front Limbs
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#3498db';
    ctx.beginPath();
    ctx.moveTo(17, 45);
    ctx.lineTo(17 + limbSwing * 15, 55);
    ctx.lineTo(17 + limbSwing * 20, 70);
    ctx.stroke();

    ctx.strokeStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(17, 25);
    ctx.lineTo(17 - limbSwing * 12, 35);
    ctx.lineTo(17 - limbSwing * 18, 25);
    ctx.stroke();

    // Shoes
    ctx.fillStyle = '#333';
    ctx.fillRect(17 + limbSwing * 20 - 4, 66, 10, 5);
    ctx.fillRect(17 - limbSwing * 20 - 4, 66, 10, 5);

    ctx.restore();
}

function drawObstacle(obs) {
    ctx.save();
    if (obs.type === 'tree') {
        ctx.font = `${obs.height}px serif`;
        ctx.fillText('🌵', obs.x, obs.y + obs.height - 5);
    } else {
        ctx.font = `${obs.height * 1.5}px serif`;
        ctx.fillText('🪨', obs.x, obs.y + obs.height);
    }
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Horizon line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    drawPlayer(player.x, player.y);

    for (const obstacle of obstacles) {
        drawObstacle(obstacle);
    }
    
    if (!gameActive && gameOverElement.style.display !== 'flex') {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TAP OR CLICK TO START', canvas.width/2, canvas.height/2);
    }
}

function gameLoop() {
    update();
    draw();
    if (gameActive || (!gameActive && gameOverElement.style.display !== 'flex')) {
        requestAnimationFrame(gameLoop);
    }
}

// Initial display
updateHighScoreDisplay();
draw();
requestAnimationFrame(gameLoop);
