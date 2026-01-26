/**
 * Simple confetti celebration utility
 * Uses CSS animations and DOM manipulation for a lightweight implementation
 */

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  colors?: string[];
  duration?: number;
}

const defaultColors = [
  '#f97316', // orange-500 (ServiceFlow brand)
  '#22c55e', // green-500
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#eab308', // yellow-500
  '#ec4899', // pink-500
];

function createConfettiParticle(
  container: HTMLElement,
  colors: string[],
  spread: number
): HTMLElement {
  const particle = document.createElement('div');
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = Math.random() * 10 + 5;
  const startX = window.innerWidth / 2 + (Math.random() - 0.5) * spread;
  const startY = window.innerHeight * 0.3;

  // Random shape: square, rectangle, or circle
  const shapes = ['square', 'rectangle', 'circle'];
  const shape = shapes[Math.floor(Math.random() * shapes.length)];

  particle.style.cssText = `
    position: fixed;
    width: ${shape === 'rectangle' ? size * 0.5 : size}px;
    height: ${size}px;
    background-color: ${color};
    left: ${startX}px;
    top: ${startY}px;
    pointer-events: none;
    z-index: 9999;
    border-radius: ${shape === 'circle' ? '50%' : '2px'};
  `;

  container.appendChild(particle);
  return particle;
}

function animateParticle(particle: HTMLElement, duration: number): void {
  const startTime = performance.now();
  const startX = parseFloat(particle.style.left);
  const startY = parseFloat(particle.style.top);
  const velocityX = (Math.random() - 0.5) * 600;
  const velocityY = Math.random() * -400 - 200;
  const rotation = Math.random() * 720 - 360;
  const gravity = 800;

  function update(currentTime: number) {
    const elapsed = (currentTime - startTime) / 1000;
    const progress = elapsed / (duration / 1000);

    if (progress >= 1) {
      particle.remove();
      return;
    }

    const x = startX + velocityX * elapsed;
    const y = startY + velocityY * elapsed + 0.5 * gravity * elapsed * elapsed;
    const currentRotation = rotation * elapsed;
    const opacity = 1 - progress;

    particle.style.transform = `rotate(${currentRotation}deg)`;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.opacity = String(opacity);

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

/**
 * Triggers a basic confetti burst
 */
export function triggerConfetti(options: ConfettiOptions = {}): void {
  const {
    particleCount = 50,
    spread = 200,
    colors = defaultColors,
    duration = 2000,
  } = options;

  // Create container for confetti
  const container = document.createElement('div');
  container.id = 'confetti-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    overflow: hidden;
  `;
  document.body.appendChild(container);

  // Create and animate particles
  for (let i = 0; i < particleCount; i++) {
    setTimeout(() => {
      const particle = createConfettiParticle(container, colors, spread);
      animateParticle(particle, duration);
    }, Math.random() * 200);
  }

  // Clean up container after animation
  setTimeout(() => {
    container.remove();
  }, duration + 500);
}

/**
 * Triggers a more celebratory confetti burst for special occasions
 * like completing the first job
 */
export function triggerFirstJobConfetti(): void {
  // First burst - center
  triggerConfetti({
    particleCount: 80,
    spread: 300,
    duration: 2500,
  });

  // Second burst - delayed, left side
  setTimeout(() => {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;
    document.body.appendChild(container);

    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const particle = createConfettiParticle(container, defaultColors, 150);
        // Offset to left side
        particle.style.left = `${window.innerWidth * 0.25 + (Math.random() - 0.5) * 150}px`;
        animateParticle(particle, 2000);
      }, Math.random() * 150);
    }

    setTimeout(() => container.remove(), 2500);
  }, 300);

  // Third burst - delayed, right side
  setTimeout(() => {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    `;
    document.body.appendChild(container);

    for (let i = 0; i < 40; i++) {
      setTimeout(() => {
        const particle = createConfettiParticle(container, defaultColors, 150);
        // Offset to right side
        particle.style.left = `${window.innerWidth * 0.75 + (Math.random() - 0.5) * 150}px`;
        animateParticle(particle, 2000);
      }, Math.random() * 150);
    }

    setTimeout(() => container.remove(), 2500);
  }, 500);
}
