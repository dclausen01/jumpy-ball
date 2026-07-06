const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY = 0.35;
const JUMP_HEIGHT = -6.5;
const BIRD_RADIUS = 20;
const BIRD_SPEED = 5;
const GROUND_HEIGHT = 100;
const PIPE_WIDTH = 80;
const PIPE_SPEED = 3;
const PIPE_INTERVAL = 160;
const INITIAL_GAP = 280;
const SKY_COLOR = '#87CEEB';
const GROUND_COLOR = '#2ecc71';
const POINTS_PER_PIPE = 10;

const COLOR_STEPS = [
    '#1a4d2e', '#2ecc71', '#96ce3e', '#fdfb8c', '#f1c40f',
    '#ffcc00', '#ff8c00', '#ff5252', '#e74c3c', '#8b0000'
];

const clouds = [
    { x: 100, y: 150, size: 40, speed: 0.3 },
    { x: 400, y: 245, size: 60, speed: 0.4 },
    { x: 800, y: 120, size: 50, speed: 0.3 }
];

const PLAYER_CONFIGS = [
    { startX: 100, startYOffset: 0, color: '#e74c3c', outlineColor: 'white', name: 'Rot', leftKey: 'ArrowLeft', rightKey: 'ArrowRight', jumpKeys: ['Space', 'ArrowUp'] },
    { startX: 140, startYOffset: -50, color: '#00bfff', outlineColor: 'white', name: 'Blau', leftKey: 'KeyA', rightKey: 'KeyD', jumpKeys: ['KeyW'] },
];

const POWERUP_DURATION = 5000;
const POWERUP_TYPES = ['fast', 'slow', 'wide'];

const state = {
    phase: 'menu',
    mode: 'single',
    startTime: Date.now(),
    endTime: null,
    frameCount: 0,
    currentLevel: 0,
    level: 1,
    score: 0,
    highScore: parseInt(localStorage.getItem('jumpy_highscore') || '0'),
    currentGap: INITIAL_GAP,
    targetColor: COLOR_STEPS[0],
    powerUp: null,
    powerUpEndTime: 0,
    soundEnabled: false,
};

let pipes = [];
let players = [];
let particles = [];
let powerUpItem = null;
const keys = {};

let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    state.soundEnabled = true;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!state.soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'jump') {
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'crash') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'pass') {
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'powerup') {
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
            osc.type = 'triangle';
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
        }
    } catch (e) {}
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function createPlayers() {
    players = PLAYER_CONFIGS.map((config, index) => ({
        x: config.startX,
        y: canvas.height / 2 + config.startYOffset,
        radius: BIRD_RADIUS,
        velocity: 0,
        speed: BIRD_SPEED,
        alive: state.mode !== 'single' || index === 0,
        deathTime: null,
        score: 0,
        color: config.color,
        outlineColor: config.outlineColor,
        name: config.name,
        leftKey: config.leftKey,
        rightKey: config.rightKey,
        jumpKeys: config.jumpKeys,
    }));
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

    const eyeOffsetX = 6;
    const eyeY = player.y - 4;
    const eyeRadius = 5;
    const pupilRadius = 2.5;
    const pupilShiftY = Math.max(-2, Math.min(2, player.velocity * 0.3));

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x - eyeOffsetX, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.arc(player.x + eyeOffsetX, eyeY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(player.x - eyeOffsetX, eyeY + pupilShiftY, pupilRadius, 0, Math.PI * 2);
    ctx.arc(player.x + eyeOffsetX, eyeY + pupilShiftY, pupilRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const smileRadius = 5;
    const smileY = player.y + 5;
    ctx.arc(player.x, smileY, smileRadius, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.closePath();

    if (player.velocity < -4) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.closePath();
    }
}

function drawPipes() {
    pipes.forEach(pipe => {
        ctx.fillStyle = pipe.color;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, PIPE_WIDTH, canvas.height - (pipe.topHeight + pipe.gap));

        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(pipe.x + PIPE_WIDTH - 10, 0, 10, pipe.topHeight);
        ctx.fillRect(pipe.x + PIPE_WIDTH - 10, pipe.topHeight + pipe.gap, 10, canvas.height - (pipe.topHeight + pipe.gap));
    });
}

function drawPowerUpItem() {
    if (!powerUpItem) return;

    const pu = powerUpItem;
    const bobY = pu.y + Math.sin(state.frameCount * 0.05) * 5;

    ctx.save();
    ctx.translate(pu.x, bobY);

    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, 18 + Math.sin(state.frameCount * 0.08) * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (pu.type === 'fast') {
        ctx.fillText('⚡', 0, 0);
    } else if (pu.type === 'slow') {
        ctx.fillText('🐌', 0, 0);
    } else if (pu.type === 'wide') {
        ctx.fillText('💫', 0, 0);
    }

    ctx.restore();
}

function drawBackground() {
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT - 8, canvas.width, 8);

    ctx.fillStyle = 'white';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.arc(cloud.x - cloud.size * 0.5, cloud.y + cloud.size * 0.3, cloud.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.arc(cloud.x + cloud.size * 0.5, cloud.y + cloud.size * 0.3, cloud.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        cloud.x += cloud.speed;
        if (cloud.x > canvas.width + cloud.size) cloud.x = -cloud.size;
    });
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= p.fadeSpeed;

        if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.globalAlpha = 1;
    }
}

function spawnExplosion(x, y, color) {
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            size: Math.random() * 4 + 2,
            color: color,
            alpha: 1,
            fadeSpeed: 0.02 + Math.random() * 0.01,
        });
    }
    for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            size: Math.random() * 3 + 1,
            color: '#ffffff',
            alpha: 1,
            fadeSpeed: 0.03 + Math.random() * 0.02,
        });
    }
}

function drawUI() {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Arial';

    ctx.fillStyle = 'white';
    ctx.fillText(`Zeit: ${Math.floor((Date.now() - state.startTime) / 1000)}s`, 20, 40);

    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Score: ${state.score}`, 20, 75);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Level ${state.level}`, 20, 105);

    ctx.fillStyle = '#ccc';
    ctx.font = '18px Arial';
    ctx.fillText(`Best: ${state.highScore}`, 20, 130);

    if (state.mode === 'multi') {
        players.forEach((player, i) => {
            ctx.fillStyle = player.color;
            ctx.font = 'bold 22px Arial';
            ctx.fillText(`${player.name}: ${player.alive ? 'Lebt' : 'Tot'} | ${player.score}pts`, 20, 170 + i * 30);
        });
    }

    if (state.powerUp) {
        const remaining = Math.ceil((state.powerUpEndTime - Date.now()) / 1000);
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#ffd700';

        if (state.powerUp === 'fast') {
            ctx.fillText(`⚡ Super Speed (${remaining}s)`, canvas.width / 2, 30);
        } else if (state.powerUp === 'slow') {
            ctx.fillText(`🐌 Slow Motion (${remaining}s)`, canvas.width / 2, 30);
        } else if (state.powerUp === 'wide') {
            ctx.fillText(`💫 Wide Gap (${remaining}s)`, canvas.width / 2, 30);
        }
    }

    ctx.textAlign = 'right';
    ctx.font = '18px Arial';
    ctx.fillStyle = state.soundEnabled ? '#4CAF50' : '#888';
    ctx.fillText(state.soundEnabled ? '🔊 Sound ON' : '🔇 Sound OFF', canvas.width - 20, 40);

    ctx.restore();
}

function drawMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';

    ctx.font = 'bold 56px Arial';
    ctx.fillText('Jumpy Ball', canvas.width / 2, canvas.height / 2 - 100);

    ctx.font = 'bold 32px Arial';
    ctx.fillText('[1] Singleplayer', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillText('[2] Multiplayer', canvas.width / 2, canvas.height / 2 + 20);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Pfeiltasten / Space = Springen & Bewegen', canvas.width / 2, canvas.height / 2 + 70);
    ctx.fillText('Touch = Springen (Mobile)', canvas.width / 2, canvas.height / 2 + 95);

    if (state.highScore > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Highscore: ${state.highScore}`, canvas.width / 2, canvas.height / 2 + 140);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '16px Arial';
    ctx.fillText('M = Sound an/aus | F = Vollbild', canvas.width / 2, canvas.height / 2 + 180);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = 'bold 48px Arial';

    const totalSeconds = Math.floor((state.endTime - state.startTime) / 1000);

    if (state.mode === 'single') {
        const survivalTime = players[0].deathTime || totalSeconds;
        ctx.fillText(`Game Over nach ${survivalTime}s`, canvas.width / 2, canvas.height / 2 - 60);

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Score: ${state.score}`, canvas.width / 2, canvas.height / 2 - 20);

        if (state.score >= state.highScore && state.score > 0) {
            ctx.fillStyle = '#ff0';
            ctx.font = 'bold 28px Arial';
            ctx.fillText('NEUER HIGHSCORE!', canvas.width / 2, canvas.height / 2 + 15);
        }
    } else {
        ctx.fillText(`Game Over nach ${totalSeconds}s`, canvas.width / 2, canvas.height / 2 - 80);

        const alivePlayer = players.find(p => p.alive);
        let winner = null;

        if (alivePlayer) {
            winner = alivePlayer.name;
        } else {
            const [p1, p2] = players;
            if (p1.deathTime > p2.deathTime) winner = p1.name;
            else if (p2.deathTime > p1.deathTime) winner = p2.name;
        }

        ctx.font = 'bold 36px Arial';
        if (winner) {
            ctx.fillText(`Gewinner: ${winner}!`, canvas.width / 2, canvas.height / 2 - 40);
        } else {
            ctx.fillText('Unentschieden!', canvas.width / 2, canvas.height / 2 - 40);
        }

        ctx.font = '24px Arial';
        ctx.fillStyle = 'white';
        players.forEach((p, i) => {
            ctx.fillText(`${p.name}: ${p.deathTime || totalSeconds}s | ${p.score}pts`, canvas.width / 2, canvas.height / 2 + 10 + i * 30);
        });
    }

    ctx.font = '20px Arial';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Space = Neustart | ESC = Menü', canvas.width / 2, canvas.height / 2 + 130);
}

function checkCollision(player) {
    if (!player.alive) return false;
    if (player.y + player.radius > canvas.height - GROUND_HEIGHT || player.y - player.radius < 0) {
        return true;
    }
    for (const pipe of pipes) {
        if (player.x + player.radius > pipe.x &&
            player.x - player.radius < pipe.x + PIPE_WIDTH &&
            (player.y - player.radius < pipe.topHeight || player.y + player.radius > pipe.topHeight + pipe.gap)) {
            return true;
        }
    }
    return false;
}

function updateDifficulty() {
    const elapsed = (Date.now() - state.startTime) / 1000;
    const seconds = Math.floor(elapsed);
    const currentLevel = Math.floor(seconds / 20);

    const progress = elapsed / 20 - currentLevel;
    const maxLevel = 9;

    if (currentLevel <= maxLevel) {
        const gapStart = 280 - currentLevel * 15;
        const gapEnd = 280 - (currentLevel + 1) * 15;
        state.currentGap = gapStart - progress * (gapStart - gapEnd);
    } else {
        state.currentGap = 280 - maxLevel * 15 - (elapsed - maxLevel * 20) * 0.5;
        state.currentGap = Math.max(state.currentGap, 100);
    }

    state.currentLevel = currentLevel;
    state.level = currentLevel + 1;

    const stageIndex = Math.min(Math.floor(currentLevel / 2), COLOR_STEPS.length - 1);
    state.targetColor = COLOR_STEPS[stageIndex];
}

function getCurrentPipeSpeed() {
    let speed = PIPE_SPEED;
    if (state.currentLevel >= 3) speed += (state.currentLevel - 3) * 0.2;
    if (state.currentLevel >= 6) speed += (state.currentLevel - 6) * 0.3;
    if (state.powerUp === 'slow') speed *= 0.5;
    if (state.powerUp === 'fast') speed *= 1.5;
    return speed;
}

function updatePlayer(player) {
    if (!player.alive) return;

    const gravityMod = state.powerUp === 'slow' ? 0.7 : 1;
    player.velocity += GRAVITY * gravityMod;
    player.y += player.velocity;

    const speedMod = state.powerUp === 'fast' ? 2 : 1;
    if (keys[player.leftKey] && player.x > player.radius) {
        player.x -= player.speed * speedMod;
    }
    if (keys[player.rightKey] && player.x < canvas.width - player.radius) {
        player.x += player.speed * speedMod;
    }

    if (powerUpItem) {
        const pu = powerUpItem;
        const bobY = pu.y + Math.sin(state.frameCount * 0.05) * 5;
        const dx = player.x - pu.x;
        const dy = player.y - bobY;
        if (Math.sqrt(dx * dx + dy * dy) < player.radius + 12) {
            state.powerUp = pu.type;
            state.powerUpEndTime = Date.now() + POWERUP_DURATION;
            powerUpItem = null;
            playSound('powerup');
        }
    }

    if (checkCollision(player)) {
        player.alive = false;
        player.deathTime = Math.floor((Date.now() - state.startTime) / 1000);
        spawnExplosion(player.x, player.y, player.color);
        playSound('crash');
    }
}

function updateScore() {
    players.forEach((player, idx) => {
        if (!player.alive) return;
        for (const pipe of pipes) {
            if (!pipe.passedBy.has(idx) && pipe.x + PIPE_WIDTH < player.x - player.radius) {
                pipe.passedBy.add(idx);
                player.score += POINTS_PER_PIPE;
                playSound('pass');
            }
        }
    });

    if (state.mode === 'single' && players[0]) {
        state.score = players[0].score;
    } else if (state.mode === 'multi') {
        state.score = Math.max(...players.map(p => p.score), 0);
    }
}

function updatePowerUp() {
    if (state.powerUp && Date.now() > state.powerUpEndTime) {
        state.powerUp = null;
    }
}

function updatePipes() {
    const currentSpawnRate = Math.max(100, PIPE_INTERVAL - state.currentLevel * 8);
    if (state.frameCount % currentSpawnRate === 0) {
        const minPipeHeight = 50;
        const maxPipeHeight = canvas.height - state.currentGap - minPipeHeight - GROUND_HEIGHT;
        const range = Math.min(maxPipeHeight - minPipeHeight, 200 + (state.currentLevel * 50));
        if (range > 0) {
            const topHeight = Math.floor(Math.random() * range) + minPipeHeight;
            const effectiveGap = state.powerUp === 'wide' ? state.currentGap + 40 : state.currentGap;
            pipes.push({
                x: canvas.width,
                topHeight,
                gap: effectiveGap,
                color: state.targetColor,
                passedBy: new Set(),
            });
        }
    }

    const speed = getCurrentPipeSpeed();
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= speed;
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }

    if (!powerUpItem && state.frameCount > 300 && Math.random() < 0.002) {
        const nearestPipe = pipes.find(p => p.x > canvas.width - PIPE_WIDTH * 2 && p.x < canvas.width + PIPE_WIDTH);
        if (nearestPipe) {
            const gapTop = nearestPipe.topHeight;
            const gapBottom = nearestPipe.topHeight + nearestPipe.gap;
            const padding = 20;
            const minY = gapTop + padding;
            const maxY = gapBottom - padding;
            if (maxY > minY) {
                const py = Math.floor(Math.random() * (maxY - minY)) + minY;
                powerUpItem = {
                    x: nearestPipe.x + PIPE_WIDTH / 2,
                    y: py,
                    type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)],
                };
            }
        } else {
            const safeY = canvas.height / 2 + (Math.random() - 0.5) * 100;
            const safeYClamped = Math.max(80, Math.min(canvas.height - GROUND_HEIGHT - 80, safeY));
            powerUpItem = {
                x: canvas.width + 200,
                y: safeYClamped,
                type: POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)],
            };
        }
    }

    if (powerUpItem) {
        powerUpItem.x -= speed;
        if (powerUpItem.x < -30) {
            powerUpItem = null;
        }
    }
}

function saveHighScore() {
    if (state.score > state.highScore) {
        state.highScore = state.score;
        localStorage.setItem('jumpy_highscore', String(state.highScore));
    }
}

function resetGame() {
    createPlayers();
    pipes.length = 0;
    particles.length = 0;
    powerUpItem = null;
    state.startTime = Date.now();
    state.endTime = null;
    state.frameCount = 0;
    state.currentLevel = 0;
    state.level = 1;
    state.score = 0;
    state.currentGap = INITIAL_GAP;
    state.targetColor = COLOR_STEPS[0];
    state.powerUp = null;
    state.powerUpEndTime = 0;
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
        drawPowerUpItem();
        drawParticles();
        players.forEach(p => drawBirdEntity(p));
        drawUI();
        drawGameOver();
        requestAnimationFrame(update);
        return;
    }

    updateDifficulty();
    updatePowerUp();
    players.forEach(p => updatePlayer(p));
    updatePipes();
    updateScore();

    drawPipes();
    drawPowerUpItem();
    drawParticles();
    players.forEach(p => drawBirdEntity(p));
    drawUI();

    const aliveCount = players.filter(p => p.alive).length;
    if (state.mode === 'single' && aliveCount === 0) {
        state.endTime = Date.now();
        state.phase = 'gameover';
        saveHighScore();
    } else if (state.mode === 'multi' && aliveCount === 0) {
        state.endTime = Date.now();
        state.phase = 'gameover';
        saveHighScore();
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
        } else if (e.code === 'KeyM') {
            initAudio();
        } else if (e.code === 'KeyF') {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        }
        return;
    }

    if (e.code === 'Escape') {
        state.phase = 'menu';
        pipes.length = 0;
        powerUpItem = null;
        keys[e.code] = false;
        return;
    }

    if (e.code === 'KeyM') {
        if (state.soundEnabled) {
            state.soundEnabled = false;
        } else {
            initAudio();
        }
        return;
    }

    if (e.code === 'KeyF') {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
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
            playSound('jump');
        }
    });
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

canvas.addEventListener('touchstart', (e) => {
    if (state.phase === 'menu') {
        initAudio();
        return;
    }

    if (state.phase === 'gameover') {
        resetGame();
        if (e.cancelable) e.preventDefault();
        return;
    }

    if (!e.touches[0]) return;

    if (state.mode === 'single') {
        if (players[0] && players[0].alive) {
            players[0].velocity = JUMP_HEIGHT;
            playSound('jump');
        }
    } else {
        const touchX = e.touches[0].clientX;
        if (touchX < canvas.width / 2 && players[0] && players[0].alive) {
            players[0].velocity = JUMP_HEIGHT;
            playSound('jump');
        } else if (touchX >= canvas.width / 2 && players[1] && players[1].alive) {
            players[1].velocity = JUMP_HEIGHT;
            playSound('jump');
        }
    }

    if (e.cancelable) e.preventDefault();
}, { passive: false });

canvas.addEventListener('mousedown', (e) => {
    initAudio();
});

update();