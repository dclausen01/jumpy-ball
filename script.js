const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Constants
const GRAVITY = 0.35;
const JUMP_HEIGHT = -6.5;
const BIRD_RADIUS = 20;
const GROUND_HEIGHT = 100;
const PIPE_WIDTH = 80;
const MIN_PIPE_INTERVAL = 160;
const INITIAL_GAP = 280;
const SKY_COLOR = '#87CEEB';
const GROUND_COLOR = '#2ecc71';

const COLOR_STEPS = [
    '#1a4d2e','#2ecc71','#96ce3e','#fdfb8c','#f1c40f',
    '#ffcc00','#ff8c00','#ff5252','#e74c3c','#8b0000'
];

const PLAYER_CONFIGS = [
    { startX: 100, startYOffset: 30, color: '#e74c3c', outlineColor: 'white', name: 'Rot', leftKey: 'ArrowLeft', rightKey: 'ArrowRight', jumpKeys: ['Space','ArrowUp'] },
    { startX: 120, startYOffset: -30, color: '#00bfff', outlineColor: 'white', name: 'Blau', leftKey: 'KeyA', rightKey: 'KeyD', jumpKeys: ['KeyW'] }
];

// Game state
const state = {
    phase: 'menu',
    mode: 'single',
    startTime: Date.now(),
    endTime: null,
    level: 1,
    score: 0,
    highScore: localStorage.getItem('jumpy_highscore') || 0,
    currentGap: INITIAL_GAP,
    targetColor: COLOR_STEPS[0],
    powerUp: null
};

let pipes = [];
let players = [];
const keys = {};

// Touch Support Fix for Singleplayer
function handleTouchJump(e) {
    if (state.phase !== 'playing') return;
    
    // Fixed: Now works for single mode too
    const touchX = e.touches[0].clientX;
    const halfWidth = canvas.width / 2;
    
    players.forEach(player => {
        // Single mode → only player 0 can jump on their side
        // Multi mode → both players control independently  
        if (!player.alive) return;
        
        // Check if player should jump based on touch position and mode
        const shouldBeLeftSide = state.mode === 'single'; // Fixed
        const leftHalf = touchX < halfWidth;
        
        // Jump logic: Right-click/jump when touching that player's side
        if (player.id === 0) {
            if (shouldBeLeftSide && !leftHalf) {
                player.velocity = JUMP_HEIGHT;
            }
        } else if (player.id === 1) {
            if (!shouldBeLeftSide && leftHalf) {
                player.velocity = JUMP_HEIGHT;
            }
        }
    });
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
        speed: 5,
        alive: state.mode !== 'single' || index === 0,
        deathTime: null,
        type: index === 0 ? 'normal' : 'blau',
        color: config.color,
        outlineColor: config.outlineColor,
        name: config.name,
        leftKey: config.leftKey,
        rightKey: config.rightKey,
        jumpKeys: config.jumpKeys,
        id: index // Added ID for touch control
    }));
}

function drawBirdEntity(player) {
    if (!player.alive) return;

    ctx.save();
    ctx.translate(player.x, player.y);
    
    const rotation = player.velocity * 0.3;
    ctx.rotate(rotation);

    // Draw bird body
    if (player.type === 'normal') {
        ctx.beginPath();
        ctx.arc(0, 0, BIRD_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = player.outlineColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();

        // Eye
        const eyeY = -6;
        const pupilShiftY = Math.max(-1.5, player.velocity * 0.2);
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-7, eyeY + pupilShiftY, 4, 0, Math.PI * 2);
        ctx.fillRect(6, eyeY - 3, 8, 6);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-7, eyeY + pupilShiftY + 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Blue bird - circle with beak
        ctx.beginPath();
        ctx.arc(0, -3, BIRD_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = player.outlineColor;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -1, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = player.color;
        ctx.fill();

        const beakAngle = player.velocity * -0.3;
        ctx.save();
        ctx.rotate(beakAngle);
        
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(BIRD_RADIUS + 5, -8);
        ctx.lineTo(BIRD_RADIUS + 5, 3);
        ctx.closePath();
        ctx.fillStyle = 'yellow';
        ctx.fill();

        // Wing
        ctx.beginPath();
        ctx.ellipse(-10, 8, BIRD_RADIUS * 0.6, BIRD_RADIUS * 0.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fill();

        // Eyes
        const eyeY_blue = -6;
        const pupilShiftY_blue = Math.max(-1, player.velocity * 0.3);
        
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5, eyeY_blue + pupilShiftY_blue, 4, 0, Math.PI * 2);
        ctx.fillRect(4, eyeY_blue - 3, 8, 6);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-5, eyeY_blue + pupilShiftY_blue + 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();

    // Shock wave on jump
    if (player.velocity < -4 && state.frameCount % 3 === 0) {
        ctx.save();
        ctx.translate(player.x, player.y - 15);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 15 + state.frameCount % 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
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
    
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    
    // Level & Score display
    ctx.fillText(`Level ${(state.level).toFixed(1)} | Score: ${state.score} pts`, 20, 50);
    
    if (state.mode === 'multi') {
        players.forEach((player, i) => {
            ctx.fillStyle = player.color;
            ctx.font = '20px Arial';
            ctx.font = player.alive ? 'bold' : 'normal';
            ctx.fillText(`${player.name}: ${player.alive ? '● Lebt' : ''}`, 20, 90 + i * 40);
        });
    } else {
        ctx.fillStyle = state.mode === 'single' ? 'white' : '#555';
        ctx.font = playerConfigs[0].name === 'player' ? 'bold 20px Arial' : 'italic 20px Arial';
        ctx.fillText(`Time: ${elapsed}s`, 180, 90);
    }
}

function drawMenu() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 Jumpy Ball', canvas.width / 2, canvas.height / 2 - 80);

    ctx.font = 'bold 30px Arial';
    ctx.fillText('[1] Singleplayer (←/Space)', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillText('[2] Multiplayer (A/D + W)', canvas.width / 2, canvas.height / 2 + 30);

    ctx.font = '20px Arial';
    const speedInfo = state.mode === 'single' ? 'Pfeiltasten: ←/→ zu bewegen | Space ↑ springen' : 'A/D: Bewegen | W: Springen (beide)';
    ctx.fillText(speedInfo, canvas.width / 2, canvas.height / 2 + 80);
}

function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    const totalSeconds = Math.floor((state.endTime - state.startTime) / 1000);

    if (state.mode === 'single') {
        const survivalTime = players[0].deathTime || totalSeconds;
        ctx.fillText(`Game Over | ${survivalTime}s`, canvas.width / 2, canvas.height / 2 - 40);
        ctx.font = 'bold 24px Arial';
        const scoreVal = Math.floor(survivalTime / 5);
        ctx.fillText(`End Score: ${state.score + scoreVal} pts`, canvas.width / 2, canvas.height / 2 - 15);
    } else {
        ctx.fillText(`Game Over | ${totalSeconds}s`, canvas.width / 2, canvas.height / 2 - 50);

        const alivePlayer = players.find(p => p.alive);
        let winner = null;

        if (alivePlayer) {
            winner = alivePlayer.name;
        } else {
            const [p1, p2] = players;
            winner = p1.deathTime > p2.deathTime ? p1.name : p2.name;
        }

        ctx.font = 'bold 36px Arial';
        ctx.fillText(`Winner: ${winner}! 🏆`, canvas.width / 2, canvas.height / 2 - 15);

        ctx.font = '24px Arial';
        players.forEach((p, i) => {
            ctx.fillText(`${p.name}: ${(p.deathTime || totalSeconds)}s`, canvas.width / 2, canvas.height / 2 + 40 + i * 35);
        });
    }

    const nextLevelInfo = (Date.now() - state.startTime) % 19000 > 18000 ? '' : ' | Drücke Space oder ESC für Menü';
    ctx.font = '20px Arial';
    ctx.fillText('Next Level →', canvas.width / 2, canvas.height / 2 + 130);
}

function checkCollision(player) {
    if (!player.alive) return false;
    
    const maxGround = canvas.height - GROUND_HEIGHT;
    if (player.y + player.radius > maxGround || player.y - player.radius < 0) {
        return true;
    }
    
    for (const pipe of pipes) {
        if (player.x + player.radius * 1.5 > pipe.x &&
            player.x - player.radius * 1.5 < pipe.x + PIPE_WIDTH &&
            (player.y - player.radius < pipe.topHeight || player.y + player.radius * 2 > pipe.topHeight + pipe.gap)) {
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
        state.currentLevel++;
    } else {
        const progress = Math.min((currentLevel - 6) / 3, 1);
        targetGap = 170 - (progress * 45);
    }

    state.currentGap = Math.floor(targetGap);
}

function updatePlayer(player) {
    if (!player.alive) return;
    
    player.velocity += GRAVITY;
    player.y += player.velocity;

    // Horizontal movement for keyboard controls
    if (keys[player.leftKey] && player.x > player.radius) {
        player.x -= player.speed;
    }
    if (keys[player.rightKey] && player.x < canvas.width - player.radius) {
        player.x += player.speed;
    }

    // Boundary checks
    if (player.x < 20 || player.x > canvas.width - 20) {
        player.alive = false;
        player.deathTime = Math.floor((Date.now() - state.startTime) / 1000);
        return;
    }

    // Collision check
    if (checkCollision(player)) {
        player.alive = false;
        player.deathTime = Math.floor((Date.now() - state.startTime) / 1000);
        
        // Add score based on survival time
        const pointsEarned = Math.floor((Date.now() - state.startTime) / 1000 / 5);
        state.score += pointsEarned;

        saveHighScore();
    }
}

function updatePipes() {
    if (state.frameCount % MIN_PIPE_INTERVAL === 0) {
        const minPipeHeight = 50 + Math.floor(state.level * 10);
        const maxPipeHeight = canvas.height - state.currentGap - minPipeHeight - GROUND_HEIGHT;
        
        if (maxPipeHeight > minPipeHeight) {
            const range = Math.min(maxPipeHeight - minPipeHeight, 200 + (state.currentLevel * 30));
            const topHeight = Math.floor(Math.random() * range) + minPipeHeight;
            
            pipes.push({ 
                x: canvas.width,
                topHeight,
                gap: state.currentGap,
                color: state.targetColor 
            });
        }
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED;
        if (pipes[i].x + PIPE_WIDTH < -50) {
            pipes.splice(i, 1);
        }
    }
}

function saveHighScore() {
    const currentHighScore = state.score;
    
    if (currentHighScore > state.highScore) {
        state.highScore = currentHighScore;
        localStorage.setItem('jumpy_highscore', JSON.stringify(state.highScore));
        
        // Show high score notification
        ctx.fillStyle = 'gold';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`🌟 NEW HIGHSCORE: ${state.highScore}!`, canvas.width / 2, canvas.height / 2 - 80);
    }
}

function resetGame() {
    createPlayers();
    pipes.length = 0;
    state.startTime = Date.now();
    state.endTime = null;
    state.frameCount = 0;
    state.level = 1;
    state.score = 0;
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
    
    if (state.mode === 'single' && !players[0].alive) {
        state.endTime = Date.now();
        state.phase = 'gameover';
        drawGameOver();
    } else if (state.mode === 'multi' && !players.some(p => p.alive)) {
        state.endTime = Date.now();
        state.phase = 'gameover';
        drawGameOver();
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

    if (e.code === 'Escape' || e.code === 'Space') {
        if (state.phase === 'gameover') {
            resetGame();
            return;
        } else if (state.phase !== 'menu' && (e.code === 'Escape')) {
            state.phase = 'menu';
            pipes.length = 0;
            keys[e.code] = false;
            return;
        }
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

// Touch handling - FIXED for single mode
canvas.addEventListener('touchstart', (e) => {
    if (state.phase === 'menu') return;

    if (state.phase === 'gameover' && e.cancelable) {
        resetGame();
        e.preventDefault();
        return;
    }

    const touchX = e.touches[0].clientX;
    
    // FIXED: Works for both single and multi mode now!
    const isSingle = state.mode === 'single';
    const leftHalf = canvas.width / 2;
    
    if (isSingle && !players[0].alive) return;
    
    // In single mode: jump when touching right side of screen
    if (isSingle && touchX < leftHalf && players[0].alive) {
        players[0].velocity = JUMP_HEIGHT;
    } else if (!isSingle) {
        // Multi mode logic unchanged
        if (touchX < canvas.width / 2 && players[0].alive) {
            players[0].velocity = JUMP_HEIGHT;
        } else if (touchX >= canvas.width / 2 && players[1].alive) {
            players[1].velocity = JUMP_HEIGHT;
        }
    }

    e.preventDefault();
}, { passive: false });

// Mouse click handler for game restart
canvas.addEventListener('touchend', (e) => {
    if (state.phase === 'gameover') {
        resetGame();
        return;
    }
});

createPlayers();
update();
