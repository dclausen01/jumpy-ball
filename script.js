const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Constants
const GRAVITY = 0.5;
const JUMP_HEIGHT = -8;
const BIRD_RADIUS = 20;
const BIRD_SPEED = 5;
const GROUND_HEIGHT = 100;
const PIPE_WIDTH = 80;
const PIPE_SPEED = 4;
const PIPE_INTERVAL = 120;
const INITIAL_GAP = 250;
const SKY_COLOR = '#87CEEB';
const GROUND_COLOR = '#2ecc71';

const COLOR_STEPS = [
    '#1a4d2e',
    '#2ecc71',
    '#96ce3e',
    '#fdfb8c',
    '#f1c40f',
    '#ffcc00',
    '#ff8c00',
    '#ff5252',
    '#e74c3c',
    '#8b0000'
];

const clouds = [
    { x: 100, y: 150, size: 40, speed: 0.3 },
    { x: 400, y: 245, size: 60, speed: 0.4 },
    { x: 800, y: 120, size: 50, speed: 0.3 }
];

// Player configs
const PLAYER_CONFIGS = [
    { startX: 100, startYOffset: 0, color: '#e74c3c', outlineColor: 'white', name: 'Rot', leftKey: 'ArrowLeft', rightKey: 'ArrowRight', jumpKeys: ['Space', 'ArrowUp'] },
    { startX: 140, startYOffset: -50, color: '#00bfff', outlineColor: 'white', name: 'Blau', leftKey: 'KeyA', rightKey: 'KeyD', jumpKeys: ['KeyW'] },
];

// Game state
const state = {
    phase: 'menu',
    mode: 'single',
    startTime: Date.now(),
    frameCount: 0,
    currentGap: INITIAL_GAP,
};

const pipes = [];
let players = [];

const keys = {};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createPlayers() {
    players = PLAYER_CONFIGS.map(config => ({
        x: config.startX,
        y: canvas.height / 2 + config.startYOffset,
        radius: BIRD_RADIUS,
        velocity: 0,
        speed: BIRD_SPEED,
        alive: true,
        deathTime: null,
        color: config.color,
        outlineColor: config.outlineColor,
        name: config.name,
        leftKey: config.leftKey,
        rightKey: config.rightKey,
        jumpKeys: config.jumpKeys,
    }));

    if (state.mode === 'single') {
        players[1].alive = false;
    }
}

function drawBirdEntity(player) {
    if (!player.alive) return;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = player.outlineColor;
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.closePath();
}

function drawPipes() {
    pipes.forEach(pipe => {
        ctx.fillStyle = pipe.color;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, PIPE_WIDTH, canvas.height - (pipe.topHeight + pipe.gap));
    });
}

function drawBackground() {
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

    ctx.fillStyle = 'white';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.fill();
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width) cloud.x = -cloud.size;
    });
}

function drawUI() {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Zeit: ${Math.floor((Date.now() - state.startTime) / 1000)}s`, 20, 40);

    if (state.mode === 'multi') {
        players.forEach((player, i) => {
            ctx.fillStyle = player.color;
            ctx.fillText(`${player.name}: ${player.alive ? 'Lebt' : 'Tot'}`, 20, 80 + i * 40);
        });
    }
}

function drawMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Jumpy Ball', canvas.width / 2, canvas.height / 2 - 80);

    ctx.font = 'bold 30px Arial';
    ctx.fillText('[1] Singleplayer', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('[2] Multiplayer', canvas.width / 2, canvas.height / 2 + 30);

    ctx.font = '20px Arial';
    ctx.fillText('Drücke 1 oder 2 zum Starten', canvas.width / 2, canvas.height / 2 + 80);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';

    const seconds = Math.floor((Date.now() - state.startTime) / 1000);

    if (state.mode === 'single') {
        const survivalTime = players[0].deathTime || seconds;
        ctx.fillText(`Game Over nach ${survivalTime} s`, canvas.width / 2, canvas.height / 2 - 30);
    } else {
        ctx.fillText(`Game Over nach ${seconds} s`, canvas.width / 2, canvas.height / 2 - 60);

        const alivePlayer = players.find(p => p.alive);
        let winner = null;

        if (alivePlayer) {
            winner = alivePlayer.name;
        } else {
            const [p1, p2] = players;
            if (p1.deathTime > p2.deathTime) {
                winner = p1.name;
            } else if (p2.deathTime > p1.deathTime) {
                winner = p2.name;
            }
        }

        ctx.font = 'bold 36px Arial';
        if (winner) {
            ctx.fillText(`Gewinner: ${winner}!`, canvas.width / 2, canvas.height / 2 - 10);
        } else {
            ctx.fillText('Unentschieden!', canvas.width / 2, canvas.height / 2 - 10);
        }

        ctx.font = '24px Arial';
        players.forEach(p => {
            ctx.fillText(`${p.name}: ${p.deathTime || seconds}s`, canvas.width / 2, canvas.height / 2 + 30);
        });
    }

    ctx.font = '20px Arial';
    ctx.fillText('Space = Neustart | ESC = Menü', canvas.width / 2, canvas.height / 2 + 80);
}

function checkCollision(player) {
    if (!player.alive) return false;
    if (player.y + player.radius > canvas.height - GROUND_HEIGHT || player.y - player.radius < 0) {
        return true;
    }
    for (const p of pipes) {
        if (player.x + player.radius > p.x &&
            player.x - player.radius < p.x + PIPE_WIDTH &&
            (player.y - player.radius < p.topHeight || player.y + player.radius > p.topHeight + p.gap)) {
            return true;
        }
    }
    return false;
}

function updateDifficulty() {
    const seconds = Math.floor((Date.now() - state.startTime) / 1000);
    const currentLevel = Math.floor(seconds / 20);

    let targetGap = INITIAL_GAP;

    if (currentLevel < 3) {
        const progress = Math.min(currentLevel / 3, 1);
        targetGap = 250 - (progress * 40);
    } else if (currentLevel < 6) {
        const progress = Math.min((currentLevel - 3) / 3, 1);
        targetGap = 210 - (progress * 40);
    } else {
        const progress = Math.min((currentLevel - 6) / 3, 1);
        targetGap = 170 - (progress * 45);
    }

    state.currentGap = targetGap;

    const stageIndex = Math.min(Math.floor(currentLevel / 2), COLOR_STEPS.length - 1);
    state.targetColor = COLOR_STEPS[stageIndex];
    state.currentLevel = currentLevel;
}

function updatePlayer(player) {
    if (!player.alive) return;
    player.velocity += GRAVITY;
    player.y += player.velocity;

    if (keys[player.leftKey] && player.x > player.radius) {
        player.x -= player.speed;
    }
    if (keys[player.rightKey] && player.x < canvas.width - player.radius) {
        player.x += player.speed;
    }

    if (checkCollision(player)) {
        player.alive = false;
        player.deathTime = Math.floor((Date.now() - state.startTime) / 1000);
    }
}

function updatePipes() {
    if (state.frameCount % PIPE_INTERVAL === 0) {
        const minPipeHeight = 50;
        const maxPipeHeight = canvas.height - state.currentGap - minPipeHeight - GROUND_HEIGHT;
        const range = Math.min(maxPipeHeight - minPipeHeight, 200 + (state.currentLevel * 50));
        const topHeight = Math.floor(Math.random() * range) + minPipeHeight;
        pipes.push({ x: canvas.width, topHeight, gap: state.currentGap, color: state.targetColor });
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED;
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
}

function resetGame() {
    createPlayers();
    pipes.length = 0;
    state.startTime = Date.now();
    state.frameCount = 0;
    state.phase = 'playing';
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (state.phase === 'menu') {
        drawMenu();
        requestAnimationFrame(update);
        return;
    }

    if (state.phase === 'gameover') {
        drawPipes();
        players.forEach(p => drawBirdEntity(p));
        drawUI();
        drawGameOver();
        requestAnimationFrame(update);
        return;
    }

    drawUI();
    updateDifficulty();
    players.forEach(p => updatePlayer(p));
    updatePipes();

    drawPipes();
    players.forEach(p => drawBirdEntity(p));

    const aliveCount = players.filter(p => p.alive).length;
    if (state.mode === 'single' && aliveCount === 0) {
        state.phase = 'gameover';
    } else if (state.mode === 'multi' && aliveCount === 0) {
        state.phase = 'gameover';
    }

    state.frameCount++;
    requestAnimationFrame(update);
}

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (state.phase === 'menu') {
        if (e.code === 'Digit1') {
            state.mode = 'single';
            resetGame();
        } else if (e.code === 'Digit2') {
            state.mode = 'multi';
            resetGame();
        }
        return;
    }

    if (e.code === 'Escape') {
        state.phase = 'menu';
        pipes.length = 0;
        keys[e.code] = false;
        return;
    }

    if (state.phase === 'gameover') {
        if (e.code === 'Space') {
            resetGame();
        }
        return;
    }

    players.forEach(player => {
        if (player.jumpKeys.includes(e.code) && player.alive) {
            player.velocity = JUMP_HEIGHT;
        }
    });
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

window.addEventListener('touchstart', (e) => {
    if (state.phase === 'menu') {
        return;
    }

    if (state.phase === 'gameover') {
        resetGame();
        if (e.cancelable) e.preventDefault();
        return;
    }

    const touchX = e.touches[0].clientX;

    if (state.mode === 'multi') {
        if (touchX < canvas.width / 2 && players[0].alive) {
            players[0].velocity = JUMP_HEIGHT;
        } else if (touchX >= canvas.width / 2 && players[1].alive) {
            players[1].velocity = JUMP_HEIGHT;
        }
    } else {
        if (players[0].alive) {
            players[0].velocity = JUMP_HEIGHT;
        }
    }

    if (e.cancelable) e.preventDefault();
}, { passive: false });

update();
