/**
 * Neon Invaders Game Script
 * A modern take on the classic Space Invaders
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const finalScoreEl = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game Constants
const PROJECTILE_SPEED = 7;
const ENEMY_SPEED_BASE = 1;
const PLAYER_SPEED = 5;
const PARTICLES_COUNT = 15;

// Game State
let gameActive = false;
let score = 0;
let level = 1;
let animationId;
let lastTime = 0;

// Inputs
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

// --- Classes ---

class Player {
    constructor() {
        this.width = 40;
        this.height = 30;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 20;
        this.color = '#00f3ff';
        this.velocity = 0;
        this.shootTimer = 0;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // Ship body (Triangle shape)
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();

        // Engine glow
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.2;
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height + 10);
        ctx.lineTo(this.x + this.width - 10, this.y + this.height);
        ctx.fill();

        ctx.restore();
    }

    update() {
        if (keys.ArrowLeft && this.x > 0) {
            this.x -= PLAYER_SPEED;
            // Tilt effect could be added here
        }
        if (keys.ArrowRight && this.x + this.width < canvas.width) {
            this.x += PLAYER_SPEED;
        }

        this.shootTimer++;
        if (keys.Space && this.shootTimer > 15) {
            projectiles.push(new Projectile(
                this.x + this.width / 2,
                this.y,
                -PROJECTILE_SPEED,
                this.color,
                true // isPlayer
            ));
            this.shootTimer = 0;
            playSound('shoot');
        }
    }
}

class Projectile {
    constructor(x, y, velocity, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.radius = 3;
        this.velocity = velocity;
        this.color = color;
        this.isPlayer = isPlayer;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Trail effect
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + (this.velocity * 3));
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();

        ctx.restore();
    }

    update() {
        this.y += this.velocity;
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 25;
        this.type = type; // 0, 1, 2 for different colors/shapes
        // Colors: Pink, Yellow, Purple
        this.colors = ['#ff0055', '#ffe600', '#aa00ff'];
        this.color = this.colors[type % 3];
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // Simple pixel-art-ish shapes drawn with paths for smoothness
        const w = this.width;
        const h = this.height;
        const x = this.x;
        const y = this.y;

        if (this.type % 3 === 0) {
            // "Crab" shape
            ctx.fillRect(x, y + h / 3, w, h / 3);
            ctx.fillRect(x + w / 4, y, w / 2, h / 3);
            ctx.fillRect(x, y + h * 0.66, w / 4, h / 3);
            ctx.fillRect(x + w * 0.75, y + h * 0.66, w / 4, h / 3);
        } else if (this.type % 3 === 1) {
            // "Squid" shape
            ctx.beginPath();
            ctx.moveTo(x + w / 2, y);
            ctx.lineTo(x + w, y + h / 2);
            ctx.lineTo(x + w * 0.8, y + h);
            ctx.lineTo(x + w * 0.5, y + h * 0.7);
            ctx.lineTo(x + w * 0.2, y + h);
            ctx.lineTo(x, y + h / 2);
            ctx.fill();
        } else {
            // "UFO" shape
            ctx.beginPath();
            ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 4);
        }

        ctx.restore();
    }

    update({ velocity }) {
        this.x += velocity.x;
        this.y += velocity.y;
    }

    shoot(projectiles) {
        // Enemies shoot downwards
        projectiles.push(new Projectile(
            this.x + this.width / 2,
            this.y + this.height,
            4, // speed
            this.color,
            false // isPlayer
        ));
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 3 + 1; // Slightly larger
        this.color = color;

        // Circular explosion pattern
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 6 + 2; // Speed 2-8

        this.velocity = {
            x: Math.cos(angle) * velocity,
            y: Math.sin(angle) * velocity
        };
        this.alpha = 1;
        this.decay = 0.015 + Math.random() * 0.02; // Slower fade
        this.friction = 0.95; // Slow down over time
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
    }
}

class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 1.5;
        this.speed = Math.random() * 2 + 0.5; // Parallax speed
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.y = 0;
            this.x = Math.random() * canvas.width;
        }
    }
}

// --- Global Arrays & Variables ---
let player;
let projectiles = [];
let enemies = [];
let particles = [];
let stars = [];
let enemyVelocity = { x: ENEMY_SPEED_BASE, y: 0 };
let enemyDirection = 1; // 1 for right, -1 for left

// --- Initialization ---

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create Stars for background
    stars = [];
    for (let i = 0; i < 50; i++) {
        stars.push(new Star());
    }

    bindControls();

    // Start Screen is active by default in HTML
}

function resizeCanvas() {
    const container = document.querySelector('.game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // If player exists, clamp position
    if (player) {
        player.x = Math.min(player.x, canvas.width - player.width);
        player.y = canvas.height - player.height - 20;
    }
}

function startGame() {
    initAudio(); // Initialize Audio Context
    score = 0;
    level = 1;
    updateUI();

    player = new Player();
    projectiles = [];
    particles = [];

    createEnemies();

    gameActive = true;
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');

    animate();
}

function createEnemies() {
    enemies = [];
    const cols = 8;
    const rows = 4;
    const padding = 15;
    const enemyWidth = 30; // Approx

    // Calculate start X to center the block
    const blockWidth = cols * (enemyWidth + padding);
    let startX = (canvas.width - blockWidth) / 2;
    let startY = 60;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            enemies.push(new Enemy(
                startX + c * (enemyWidth + padding),
                startY + r * 45,
                r
            ));
        }
    }

    // Increase speed with level
    const speedMultiplier = 1 + (level - 1) * 0.2;
    enemyVelocity = { x: ENEMY_SPEED_BASE * speedMultiplier * enemyDirection, y: 0 };
}

function bindControls() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
        if (e.code === 'ArrowRight') keys.ArrowRight = true;
        if (e.code === 'Space') {
            keys.Space = true;
            // Prevent scrolling
            e.preventDefault();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
        if (e.code === 'ArrowRight') keys.ArrowRight = false;
        if (e.code === 'Space') keys.Space = false;
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    // Touch controls for mobile (simple tap sides)
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touchX = e.touches[0].clientX;
        const middle = window.innerWidth / 2;
        if (touchX < middle) keys.ArrowLeft = true;
        else keys.ArrowRight = true;
        keys.Space = true; // Auto shoot on mobile touch
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        keys.ArrowLeft = false;
        keys.ArrowRight = false;
        keys.Space = false;
    });
}

// --- Audio System ---

let audioCtx;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'shoot') {
        // Player shoot: Pew pew
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);

        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }
    else if (type === 'enemyShoot') {
        // Enemy shoot: Lower pitch
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1); // Slightly longer

        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);
    }
    else if (type === 'explosion') {
        // Explosion: noise-like effect using frequency modulation or just low square
        // Simple "Boom" using low freq square wave decaying fast
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.3);

        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);

        // Add a second layer for punch
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(50, now);
        osc2.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);

        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc2.start(now);
        osc2.stop(now + 0.1);
    }
}

// --- Main Loop ---

function animate() {
    if (!gameActive) return;

    ctx.fillStyle = 'rgba(5, 5, 10, 0.3)'; // Trail effect for everything
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update Stars
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    // Player
    player.update();
    player.draw();

    // Projectiles
    projectiles.forEach((p, index) => {
        p.update();
        p.draw();

        // Remove off-screen
        if (p.y < 0 || p.y > canvas.height) {
            projectiles.splice(index, 1);
        }
    });

    // Enemies Logic
    let hitGraphEdge = false;

    // Check edges
    enemies.forEach(enemy => {
        // Move temporary to check
        if (enemy.x + enemyVelocity.x <= 0 || enemy.x + enemy.width + enemyVelocity.x >= canvas.width) {
            hitGraphEdge = true;
        }
    });

    if (hitGraphEdge) {
        enemyDirection *= -1;
        const speedMultiplier = 1 + (level - 1) * 0.2;
        enemyVelocity.x = ENEMY_SPEED_BASE * speedMultiplier * enemyDirection;

        // Move down
        enemies.forEach(enemy => {
            enemy.y += 20;
        });
    }

    enemies.forEach((enemy, index) => {
        enemy.update({ velocity: enemyVelocity });
        enemy.draw();

        // Random shooting
        if (Math.random() < 0.002 * level) {
            enemy.shoot(projectiles);
            playSound('enemyShoot');
        }

        // Collision: Player Projectile hits Enemy
        projectiles.forEach((p, pIndex) => {
            if (p.isPlayer && isColliding(p, enemy)) {
                // Effects
                createParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color);

                // Remove
                enemies.splice(index, 1);
                projectiles.splice(pIndex, 1);

                // Score
                score += 100;
                updateUI();
                playSound('explosion');
            }
        });

        // Collision: Enemy hits Player (Game Over)
        if (isCollidingRect(player, enemy)) {
            endGame();
        }

        // Enemy reaches bottom
        if (enemy.y + enemy.height > player.y) {
            endGame();
        }
    });

    // Player hit by enemy projectile
    projectiles.forEach((p, pIndex) => {
        if (!p.isPlayer && isCollidingRectCircle(player, p)) {
            createParticles(player.x + player.width / 2, player.y + player.height / 2, '#fff');
            endGame();
        }
    });

    // Particles
    particles.forEach((p, pIndex) => {
        if (p.alpha <= 0) {
            particles.splice(pIndex, 1);
        } else {
            p.update();
            p.draw();
        }
    });

    // Level Complete
    if (enemies.length === 0) {
        level++;
        createEnemies();
        updateUI();
    }

    animationId = requestAnimationFrame(animate);
}

function createParticles(x, y, color) {
    for (let i = 0; i < PARTICLES_COUNT; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function isColliding(circle, rect) {
    // Simple circle-rectish collision for projectile vs enemy
    // Enemy is treated as rect
    const distX = Math.abs(circle.x - rect.x - rect.width / 2);
    const distY = Math.abs(circle.y - rect.y - rect.height / 2);

    if (distX > (rect.width / 2 + circle.radius)) return false;
    if (distY > (rect.height / 2 + circle.radius)) return false;

    if (distX <= (rect.width / 2)) return true;
    if (distY <= (rect.height / 2)) return true;

    const dx = distX - rect.width / 2;
    const dy = distY - rect.height / 2;
    return (dx * dx + dy * dy <= (circle.radius * circle.radius));
}

function isCollidingRect(r1, r2) {
    return !(r2.x > r1.x + r1.width ||
        r2.x + r2.width < r1.x ||
        r2.y > r1.y + r1.height ||
        r2.y + r2.height < r1.y);
}

function isCollidingRectCircle(rect, circle) {
    return isColliding(circle, rect);
}

function updateUI() {
    scoreEl.innerText = score;
    levelEl.innerText = level;
    finalScoreEl.innerText = score;
}

function endGame() {
    gameActive = false;
    cancelAnimationFrame(animationId);
    gameOverScreen.classList.add('active');
}

// Start
init();
