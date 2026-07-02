const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');

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
};

// Pipes
const pipes = [];
const pipeWidth = 80;
const pipeGap = 200;
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
        ctx.fillStyle = '#2ecc71'; // Green pipes
        // Top pipe
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.topHeight + pipeGap, pipeWidth, canvas.height - (pipe.topHeight + pipeGap));
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

function update() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // Physics
    bird.velocity += gravity;
    bird.y += bird.velocity;

    // Collision detection with ceiling and floor (including ground height)
    if (bird.y + bird.radius > canvas.height - 100 || bird.y - bird.radius < 0) {
        gameOver();
    }

    // Pipe generation & movement
    if (frameCount % 120 === 0) {
        const minPipeHeight = 150;
        const maxPipeHeight = canvas.height - pipeGap - minPipeHeight - 100;
        const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight)) + minPipeHeight;
        pipes.push({ x: canvas.width, topHeight: topHeight });
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        const p = pipes[i];
        p.x -= 4;

        // Collision detection
        if (
            bird.x + bird.radius > p.x &&
            bird.x - bird.radius < p.x + pipeWidth &&
            (bird.y - bird.radius < p.topHeight || bird.y + bird.radius > p.topHeight + pipeGap)
        ) {
            gameOver();
        }

        // Score counting (removed, handled by timer in drawBackground)
        if (p.x + pipeWidth < bird.x && !p.passed) {
            p.passed = true;
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

function gameOver() {
    gameRunning = false;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    setTimeout(resetGame, 2000);
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        bird.velocity = jumpHeight;
    }
});

window.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    bird.velocity = jumpHeight;
}, { passive: false });

update();
update();
