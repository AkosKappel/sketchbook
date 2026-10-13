// Wires the "Use your own image" controls shared by the image effects: file picker, drag and drop
// anywhere on the page, Reset and error messages in the hint. Expects the #pick-image, #image-file,
// #reset-image and #hint elements. onImage receives every decoded image, starting with the default.
function setupImageInput(defaultSrc, onImage) {
  const hint = document.getElementById('hint');
  const defaultHint = hint.textContent;
  const fileInput = document.getElementById('image-file');
  const resetButton = document.getElementById('reset-image');

  async function useImage(src, isDefault) {
    try {
      const image = new Image();
      image.src = src;
      await image.decode();
      onImage(image);
      hint.textContent = defaultHint;
      resetButton.hidden = isDefault;
    } catch {
      hint.textContent = 'That image could not be loaded. Try a JPEG, PNG or WebP file.';
    }
  }

  async function useFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      hint.textContent = 'That file is not an image.';
      return;
    }
    const url = URL.createObjectURL(file);
    await useImage(url, false);
    URL.revokeObjectURL(url);
  }

  document.getElementById('pick-image').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    useFile(fileInput.files[0]);
    // Clearing lets the same file be picked again after a reset.
    fileInput.value = '';
  });
  resetButton.addEventListener('click', () => useImage(defaultSrc, true));

  // Listening on the whole page also stops a missed drop from navigating away to the file.
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    useFile(event.dataTransfer.files[0]);
  });

  useImage(defaultSrc, true);
}
