let context = null;

export function getContext() {
    if (!context) {
        context = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext initialized.");
    }
    return context;
}
