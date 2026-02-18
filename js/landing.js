// ========================================
//  Landing Page Script - Interactive Lock
// ========================================

let isUnlocked = false;
let lockClickCount = 0;

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initScrollAnimations();
    initFeatureCardTilt();
    initCounterAnimation();
});

// ========================================
//  LOCK INTERACTION
// ========================================

function handleLockClick() {
    if (isUnlocked) return;

    lockClickCount++;
    const lockBox = document.getElementById('lock3dBox');

    if (lockClickCount < 3) {
        // Shake the lock - it's not ready yet
        lockBox.classList.remove('shake');
        void lockBox.offsetWidth; // trigger reflow
        lockBox.classList.add('shake');

        // Update status
        const statusText = document.getElementById('statusText');
        const messages = [
            '🔒 Almost there... click again!',
            '🔓 One more click to unlock!'
        ];
        statusText.textContent = messages[lockClickCount - 1];
    } else {
        // UNLOCK!
        unlockLock();
    }
}

function unlockLock() {
    isUnlocked = true;

    const shackle = document.getElementById('lockShackle');
    const lockBox = document.getElementById('lock3dBox');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const ctaContainer = document.getElementById('ctaContainer');
    const enterBtn = document.getElementById('enterBtn');

    // Animate shackle opening
    shackle.classList.add('unlocked');
    lockBox.classList.remove('shake');
    lockBox.classList.add('unlocked');

    // Create sparkles
    createSparkles();

    // Update status
    statusBadge.classList.add('unlocked');
    statusText.textContent = '🔓 Unlocked — You can now enter!';

    // Show CTA button
    setTimeout(() => {
        ctaContainer.style.display = 'block';
    }, 600);

    // Make enter button glow
    enterBtn.classList.add('glow');
    enterBtn.style.animation = 'enterBtnGlow 1.5s ease-in-out infinite';

    // Change lock label
    const label = document.querySelector('.lock-label');
    if (label) label.textContent = '✓ UNLOCKED';

    // Stop pulse rings
    document.querySelectorAll('.lock-pulse-ring').forEach(ring => {
        ring.style.borderColor = 'rgba(56, 161, 105, 0.15)';
    });
}

function createSparkles() {
    const container = document.getElementById('sparkleContainer');
    const colors = ['#e8a317', '#f6c344', '#38a169', '#fff', '#68d391'];

    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        const angle = (Math.PI * 2 * i) / 20;
        const distance = 60 + Math.random() * 80;
        sparkle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        sparkle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        sparkle.style.left = '50%';
        sparkle.style.top = '50%';
        sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
        sparkle.style.width = (4 + Math.random() * 6) + 'px';
        sparkle.style.height = sparkle.style.width;
        sparkle.style.animationDelay = (Math.random() * 0.2) + 's';
        container.appendChild(sparkle);
    }

    // Clean up sparkles after animation
    setTimeout(() => { container.innerHTML = ''; }, 1200);
}

// ========================================
//  ENTER APP NAVIGATION
// ========================================

function enterApp() {
    // If lock is not unlocked, shake it
    if (!isUnlocked) {
        const lockBox = document.getElementById('lock3dBox');
        lockBox.classList.remove('shake');
        void lockBox.offsetWidth;
        lockBox.classList.add('shake');

        const statusText = document.getElementById('statusText');
        statusText.textContent = '🔒 Click the lock to unlock first!';
        return;
    }

    // Show page transition
    const transition = document.getElementById('pageTransition');
    transition.classList.add('active');

    setTimeout(() => {
        window.location.href = 'selector.html';
    }, 800);
}

// ========================================
//  PARTICLE BACKGROUND
// ========================================

function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouse = { x: undefined, y: undefined };

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
    });

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.5;
            this.speedY = (Math.random() - 0.5) * 0.5;
            this.opacity = Math.random() * 0.4 + 0.1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Mouse interaction
            if (mouse.x !== undefined) {
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 120) {
                    this.x -= dx * 0.01;
                    this.y -= dy * 0.01;
                    this.opacity = Math.min(this.opacity + 0.02, 0.7);
                }
            }

            // Wrap around edges
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(232, 163, 23, ${this.opacity})`;
            ctx.fill();
        }
    }

    // Create particles
    const numParticles = Math.min(80, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }

    function connectParticles() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                const dx = particles[a].x - particles[b].x;
                const dy = particles[a].y - particles[b].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 100) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(232, 163, 23, ${0.06 * (1 - dist / 100)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        connectParticles();
        requestAnimationFrame(animate);
    }

    animate();
}

// ========================================
//  SCROLL ANIMATIONS
// ========================================

function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.feature-card, .step-card, .stat-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(40px)';
        el.style.transition = 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
    });
}

// ========================================
//  FEATURE CARD TILT EFFECT
// ========================================

function initFeatureCardTilt() {
    document.querySelectorAll('.feature-card[data-tilt]').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -5;
            const rotateY = ((x - centerX) / centerX) * 5;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(0)`;

            // Update glow position
            const glow = card.querySelector('.feature-card-glow');
            if (glow) {
                glow.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
                glow.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);
            }
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

// ========================================
//  COUNTER ANIMATION
// ========================================

function initCounterAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('.stat-number').forEach(el => {
        observer.observe(el);
    });
}

function animateCounter(element) {
    const target = parseInt(element.dataset.target);
    const duration = 2000;
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * ease);

        element.textContent = current.toLocaleString();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = target.toLocaleString();
        }
    }

    requestAnimationFrame(update);
}

// Add enter button glow animation via JS
const style = document.createElement('style');
style.textContent = `
    @keyframes enterBtnGlow {
        0%, 100% { box-shadow: 0 4px 15px rgba(232, 163, 23, 0.3); }
        50% { box-shadow: 0 4px 30px rgba(232, 163, 23, 0.7), 0 0 60px rgba(232, 163, 23, 0.2); }
    }
`;
document.head.appendChild(style);
