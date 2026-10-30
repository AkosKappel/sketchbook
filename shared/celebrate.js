// A burst of confetti over the whole page, used when a game is won. It draws on its own fixed canvas that
// ignores the pointer and removes itself once every piece has fallen off screen.
const CONFETTI_COLORS = ['#f5b942', '#5ee6a0', '#7aa7ff', '#ff7a90', '#c39bff', '#e8ebf2'];

// x and y are the burst origin in viewport pixels, the middle of the screen by default
function celebrate(x = innerWidth / 2, y = innerHeight / 2) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100';
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const power = Math.min(innerWidth, innerHeight) / 40;
  const pieces = Array.from({ length: 160 }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = power * (0.4 + Math.random() * 0.8);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      spin: Math.random() * Math.PI,
      spinSpeed: (Math.random() - 0.5) * 0.4,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    };
  });

  let last = performance.now();
  const frame = (now) => {
    // steps are in 60 fps frames, so the burst looks the same on faster screens
    const step = Math.min((now - last) / 16.7, 3);
    last = now;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const piece of pieces) {
      piece.vx *= 0.985 ** step;
      piece.vy = piece.vy * 0.985 ** step + 0.25 * step;
      piece.x += piece.vx * step;
      piece.y += piece.vy * step;
      piece.spin += piece.spinSpeed * step;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.spin);
      // squashing one axis by the spin makes the flat pieces look like they flip over
      ctx.scale(1, Math.cos(piece.spin * 2));
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      ctx.restore();
    }
    if (pieces.some((piece) => piece.y < innerHeight + 20)) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}

// Bursts from the middle of an element, such as the game board.
function celebrateOver(element) {
  const rect = element.getBoundingClientRect();
  celebrate(rect.left + rect.width / 2, rect.top + rect.height / 2);
}
