const modeToggle = document.getElementById('modeToggle');
const modeText = document.getElementById('modeText');

modeToggle.addEventListener('change', () => {
    if (modeToggle.checked) {
        modeText.textContent = 'Modo Arquivo';
    } else {
        modeText.textContent = 'Modo Pink Noise';
    }
});
