const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const gravity = 0.5;
const jumpHeight = -8;
let gameRunning = true;
let startTime = Date.now();
let gameMode = 'menu';

// Bird objects
const bird = {
    x: 100,
    y: canvas.height / 2,
    radius: 20,
    velocity: 0,
    speed: 5,
    alive: true,
    deathTime: null,
    color: 'red',
    name: 'Rot',
};

const blueBird = {
    x: 140,
    y: canvas.height / 2 - 50,
    radius: 20,
    velocity: 0,
    speed: 5,
    alive: true,
    deathTime: null,
    color: 'blue',
    name: 'Blau',
};

// Pipes
const pipes = [];
const pipeWidth = 80;
let currentGap = 250;
let frameCount = 0;

// Background Elements (Clouds)
const clouds = [
    { x: 100, y: 150, size: 40, speed: 0.3 },
    { x: 400, y: 245, size: 60, speed: 0.4 },
    { x: 800, y: 120, size: 50, speed: 0.3 }
];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawBirdEntity(entity) {
    if (!entity.alive) return;
    ctx.beginPath();
    ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
    ctx.fillStyle = entity.color;
    ctx.fill();
    ctx.closePath();
}

function drawPipes() {
    pipes.forEach(pipe => {
        ctx.fillStyle = pipe.color;
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, pipeWidth, canvas.height - (pipe.topHeight + pipe.gap));
    });
}

function drawBackground() {
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2ecc71';
    const groundHeight = 100;
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

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
    ctx.fillText(`Time: ${Math.floor((Date.now() - startTime) / 1000)}s`, 20, 40);

    if (gameMode === 'multi') {
        ctx.fillStyle = 'red';
        ctx.fillText(bird.alive ? 'Rot: Alive' : 'Rot: Dead', 20, 80);
        ctx.fillStyle = 'blue';
        ctx.fillText(blueBird.alive ? 'Blau: Alive' : 'Blau: Dead', 20, 120);
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

function checkCollision(entity) {
    if (!entity.alive) return false;
    if (entity.y + entity.radius > canvas.height - 100 || entity.y - entity.radius < 0) {
        return true;
    }
    for (const p of pipes) {
        if (entity.x + entity.radius > p.x &&
            entity.x - entity.radius < p.x + pipeWidth &&
            (entity.y - entity.radius < p.topHeight || entity.y + entity.radius > p.topHeight + p.gap)) {
            return true;
        }
    }
    return false;
}

function updateBird(entity, leftKey, rightKey) {
    if (!entity.alive) return;
    entity.velocity += gravity;
    entity.y += entity.velocity;

    if (keys[leftKey] && entity.x > entity.radius) {
        entity.x -= entity.speed;
    }
    if (keys[rightKey] && entity.x < canvas.width - entity.radius) {
        entity.x += entity.speed;
    }

    if (checkCollision(entity)) {
        entity.alive = false;
        entity.deathTime = Math.floor((Date.now() - startTime) / 1000);
    }
}

function resetGame() {
    bird.y = canvas.height / 2;
    bird.x = 100;
    bird.velocity = 0;
    bird.alive = true;
    bird.deathTime = null;

    blueBird.y = canvas.height / 2 - 50;
    blueBird.x = 140;
    blueBird.velocity = 0;
    blueBird.alive = gameMode === 'multi';
    blueBird.deathTime = null;

    pipes.length = 0;
    startTime = Date.now();
    gameRunning = true;
    frameCount = 0;
    requestAnimationFrame(update);
}

function gameOver() {
    gameRunning = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';

    if (gameMode === 'single') {
        const seconds = bird.deathTime || Math.floor((Date.now() - startTime) / 1000);
        ctx.fillText(`Game Over nach ${seconds} s`, canvas.width / 2, canvas.height / 2 - 30);
    } else {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        ctx.fillText(`Game Over nach ${seconds} s`, canvas.width / 2, canvas.height / 2 - 60);

        let winner = null;
        if (bird.alive && !blueBird.alive) {
            winner = bird.name;
        } else if (blueBird.alive && !bird.alive) {
            winner = blueBird.name;
        } else if (!bird.alive && !blueBird.alive) {
            if (bird.deathTime > blueBird.deathTime) {
                winner = bird.name;
            } else if (blueBird.deathTime > bird.deathTime) {
                winner = blueBird.name;
            }
        }

        ctx.font = 'bold 36px Arial';
        if (winner) {
            ctx.fillText(`Gewinner: ${winner}!`, canvas.width / 2, canvas.height / 2 - 10);
        } else {
            ctx.fillText('Unentschieden!', canvas.width / 2, canvas.height / 2 - 10);
        }

        ctx.font = '24px Arial';
        ctx.fillText(`Rot: ${bird.deathTime || seconds}s | Blau: ${blueBird.deathTime || seconds}s`, canvas.width / 2, canvas.height / 2 + 30);
    }

    ctx.font = '20px Arial';
    ctx.fillText('Drücke Space zum Neustart | ESC für Menü', canvas.width / 2, canvas.height / 2 + 80);
}

// Helper for color interpolation
function lerpColor(color1, color2, factor) {
    const hexToRgb = (hex) => {
        const result = /^#([0-9a-f]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1].substring(0, 2), 16),
            g: parseInt(result[1].substring(2, 4), 16),
            b: parseInt(result[1].substring(4, 6), 16)
        } : null;
    };

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    if (!c1 || !c2) return color1;

    const r = Math.round(c1.r + (c2.r - c1.r) * factor);
    const g = Math.round(c1.g + (c2.g - c1.g) * factor);
    const b = Math.round(c1.b + (c2.b - c1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
}

function update() {
    if (gameMode === 'menu') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawMenu();
        requestAnimationFrame(update);
        return;
    }

    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawUI();

    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const currentLevel = Math.floor(seconds / 20);

    let targetGap = 250;
    let targetColor = '#2ecc71';

    const colorSteps = [
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

    let stageIndex = Math.min(Math.floor(currentLevel / 2), colorSteps.length - 1);
    targetColor = colorSteps[stageIndex];

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

    currentGap = targetGap;

    updateBird(bird, 'ArrowLeft', 'ArrowRight');
    if (gameMode === 'multi') {
        updateBird(blueBird, 'KeyA', 'KeyD');
    }

    if (frameCount % 120 === 0) {
        const minPipeHeight = 50;
        const maxPipeHeight = canvas.height - currentGap - minPipeHeight - 100;
        const range = Math.min(maxPipeHeight - minPipeHeight, 200 + (currentLevel * 50));
        const topHeight = Math.floor(Math.random() * range) + minPipeHeight;
        pipes.push({ x: canvas.width, topHeight: topHeight, gap: currentGap, color: targetColor });
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= 4;
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }

    drawPipes();
    drawBirdEntity(bird);
    if (gameMode === 'multi') {
        drawBirdEntity(blueBird);
    }

    if (gameMode === 'single' && !bird.alive) {
        gameOver();
    } else if (gameMode === 'multi' && !bird.alive && !blueBird.alive) {
        gameOver();
    }

    frameCount++;
    requestAnimationFrame(update);
}

const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (gameMode === 'menu') {
        if (e.code === 'Digit1') {
            gameMode = 'single';
            resetGame();
        } else if (e.code === 'Digit2') {
            gameMode = 'multi';
            resetGame();
        }
        return;
    }

    if (e.code === 'Escape') {
        gameMode = 'menu';
        gameRunning = false;
        pipes.length = 0;
        return;
    }

    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (!gameRunning) {
            resetGame();
        } else if (bird.alive) {
            bird.velocity = jumpHeight;
        }
    }
    if (e.code === 'KeyW') {
        if (!gameRunning) {
            resetGame();
        } else if (gameMode === 'multi' && blueBird.alive) {
            blueBird.velocity = jumpHeight;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

window.addEventListener('touchstart', (e) => {
    if (gameMode === 'menu') return;
    if (!gameRunning) {
        resetGame();
    } else if (bird.alive) {
        bird.velocity = jumpHeight;
    }
    if (e.cancelable) e.preventDefault();
}, { passive: false });

update();
