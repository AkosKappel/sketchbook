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
  new ResizeObserver(fit).observe(stage);
}
