// Scales a fixed-size canvas to fit its stage while keeping the aspect ratio.
// Only the CSS size changes; p5 maps mouse coordinates through it, so input keeps working.
function fitCanvas(canvas, width, height) {
  const stage = canvas.parentElement;
  const style = getComputedStyle(stage);
  const fit = () => {
    const availableWidth = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availableHeight = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scale = Math.min(availableWidth / width, availableHeight / height);
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
  };
  // fitting right away, not only when the observer first fires, keeps the canvas from jumping on load
  fit();
  new ResizeObserver(fit).observe(stage);
}

// Sizes a Canvas 2D canvas to fill its stage, sharp on HiDPI screens, and calls onResize(width, height)
// in CSS pixels after every stage resize. Drawing code then works in CSS pixels.
function fillStage(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  const stage = canvas.parentElement;
  new ResizeObserver(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onResize(width, height);
  }).observe(stage);
}
