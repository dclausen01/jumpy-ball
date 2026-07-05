const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const gravity = 0.5;
const jumpHeight = -8;
let gameRunning = true;
let startTime = Date.now();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Bird object
const bird = {
    x: 100,
    y: canvas.height / 2,
    radius: 20,
    velocity: 0,
    speed: 5,
};

// Pipes
const pipes = [];
const pipeWidth = 80;
let currentGap = 250; // Initial gap increased by 25% (from 200)
let frameCount = 0;

// Background Elements (Clouds)
const clouds = [
    { x: 100, y: 150, size: 40, speed: 0.3 },
    { x: 400, y: 245, size: 60, speed: 0.4 },
    { x: 800, y: 120, size: 50, speed: 0.3 }
];

function drawBird() {
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
}

function drawPipes() {
    pipes.forEach(pipe => {
        ctx.fillStyle = pipe.color;
        // Top pipe
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, pipeWidth, canvas.height - (pipe.topHeight + pipe.gap));
    });
}

function drawBackground() {
    // Sky Background (Blue)
    ctx.fillStyle = '#3498db';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground/Grass (Green)
    ctx.fillStyle = '#2ecc71';
    const groundHeight = 100;
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

    // Draw Clouds
    ctx.fillStyle = 'white';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.fill();
        cloud.x += cloud.speed;
        if (cloud.x > canvas.width) cloud.x = -cloud.size;
    });

    // Draw Score/Timer
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Time: ${Math.floor((Date.now() - startTime) / 1000)}s`, 20, 40);
}

function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    startTime = Date.now();
    gameRunning = true;
    requestAnimationFrame(update);
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
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // Difficulty/Color progression every 20 seconds
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const currentLevel = Math.floor(seconds / 20);
    const totalStages = 9;

    let targetGap = 250;
    let targetColor = '#2ecc71';

    // Defined color stages: [dark green, light green, green-yellow, light yellow, middle yellow, dark yellow, orange, light red, middle red, dark red]
    const colors = [
        '#046307', // dark green (already intended to be close)
        '#2ecc71', // light green
        '#a2cf6e', // green-yellow
        '#f9f58c', // light yellow
        '#f1c40f', // middle yellow
        '#d35400', // dark yellow / orangeish
        '#e67e22', // orange
        '#ff5252', // light red
        '#e74c3c', // middle red
        '#9b59b6'  // wait, let's use actual dark red: #800000
    ];
    // Actually, I will just define the colors clearly based on the request.
    const colorSteps = [
        '#1a4d2e', // dark green
        '#2ecc71', // light green
        '#96ce3e', // green-yellow
        '#fdfb8c', // light yellow
        '#f1c40f', // middle yellow
        '#ffcc00', // dark yellow
        '#ff8c00', // orange
        '#ff5252', // light red
        '#e74c3c', // middle red
        '#8b0000'  // dark red/blood
    ];

    let stageIndex = Math.min(Math.floor(currentLevel / 1), colorSteps.length - 1);
    // Each 2nd level (40 seconds) changes the color step? Or every level? Let's do every 2 levels to make it slower.
    // Actually, the prompt implies a progression. Let's use currentLevel directly but cap it.
    stageIndex = Math.min(Math.floor(currentLevel / 2), colorSteps.length - 1);

    targetColor = colorSteps[stageIndex];
    
    if (currentLevel < 3) { // First 60 seconds
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

    // Physics
    bird.velocity += gravity;
    bird.y += bird.velocity;
    
    if (keys['ArrowLeft'] && bird.x > bird.radius) {
        bird.x -= bird.speed;
    }
    if (keys['ArrowRight'] && bird.x < canvas.width - bird.radius) {
        bird.x += bird.speed;
    }

    // Collision detection with ceiling and floor (including ground height)
    if (bird.y + bird.radius > canvas.height - 100 || bird.y - bird.radius < 0) {
             gameOver(Math.floor((Date.now() - startTime) / 1000));
    }

    // Pipe generation & movement
    if (frameCount % 120 === 0) {
        const minPipeHeight = 50;
        const maxPipeHeight = canvas.height - currentGap - minPipeHeight - 100;
        // Increase variance with level: more possible positions as it gets harder
        const range = Math.min(maxPipeHeight - minPipeHeight, 200 + (currentLevel * 50));
        const topHeight = Math.floor(Math.random() * range) + minPipeHeight;
        pipes.push({ x: canvas.width, topHeight: topHeight, gap: currentGap, color: targetColor });

    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= 4;

        // Collision detection
        if (
            bird.x + bird.radius > p.x &&
            bird.x - bird.radius < p.x + pipeWidth &&
            (bird.y - bird.radius < p.topHeight || bird.y + bird.radius > p.topHeight + p.gap)
        ) {
        gameOver(Math.floor((Date.now() - startTime) / 1000));
        }

        // Remove off-screen pipes
        if (p.x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }

    drawPipes();
    drawBird();

    frameCount++;
    requestAnimationFrame(update);
}

function gameOver(seconds) {
    gameRunning = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Game Over nach ${seconds} s`, canvas.width / 2, canvas.height / 2);
}

const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (!gameRunning) {
            resetGame();
        } else {
            bird.velocity = jumpHeight;
        }
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

window.addEventListener('touchstart', (e) => {
    if (!gameRunning) {
        resetGame();
    } else {
        bird.velocity = jumpHeight;
    }
    if(e.cancelable) e.preventDefault();
}, { passive: false });

update();
