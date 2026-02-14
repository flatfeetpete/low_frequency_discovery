import { AudioManager } from './audioManager.js';
import { WaveformRenderer } from './waveformRenderer.js';
import { OscilloscopeRenderer } from './oscilloscopeRenderer.js';
import { SpectrogramRenderer } from './spectrogramRenderer.js';

const audioManager = new AudioManager();
const waveformRenderer = new WaveformRenderer(
    document.getElementById('waveform-canvas'),
    document.getElementById('waveform-container')
);
const oscilloscopeRenderer = new OscilloscopeRenderer(
    document.getElementById('oscilloscope-canvas'),
    document.getElementById('oscilloscope-container'),
    audioManager.analyser
);
const spectrogramRenderer = new SpectrogramRenderer(
    document.getElementById('spectrogram-canvas'),
    document.getElementById('spectrogram-container'),
    audioManager.analyser
);

// UI Elements
const playPauseBtn = document.getElementById('play-pause-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const statusText = document.getElementById('status-text');
const loadingOverlay = document.getElementById('loading-overlay');
const playhead = document.getElementById('playhead');
const waveformContainer = document.getElementById('waveform-container');

// Processing UI
const lpfFreq = document.getElementById('lpf-freq');
const lpfVal = document.getElementById('lpf-val');
const speedCtrl = document.getElementById('speed-ctrl');
const speedVal = document.getElementById('speed-val');
const pitchShift = document.getElementById('pitch-shift');
const pitchVal = document.getElementById('pitch-val');
const volumeCtrl = document.getElementById('volume-ctrl');
const volumeVal = document.getElementById('volume-val');

const AUDIO_URL = './2025-02-10-0800 upstairs with talking.wav';

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateUI() {
    const current = audioManager.currentTime;
    const duration = audioManager.duration;

    currentTimeEl.textContent = formatTime(current);

    const progress = (current / duration) * 100;
    playhead.style.left = `${progress}%`;

    // Update real-time visualizers
    oscilloscopeRenderer.update();
    spectrogramRenderer.update();

    if (audioManager.isPlaying || audioManager.ctx.state === 'running') {
        requestAnimationFrame(updateUI);
    }
}

// Start rendering loop for oscilloscope constant feedback
function renderLoop() {
    oscilloscopeRenderer.render();
    spectrogramRenderer.render();
    requestAnimationFrame(renderLoop);
}
renderLoop();

async function init() {
    try {
        statusText.textContent = 'Downloading...';
        const buffer = await audioManager.loadAudio(AUDIO_URL);

        waveformRenderer.setBuffer(buffer);
        durationEl.textContent = formatTime(buffer.duration);

        loadingOverlay.style.opacity = '0';
        setTimeout(() => loadingOverlay.style.display = 'none', 500);

        playPauseBtn.disabled = false;
        statusText.textContent = 'Ready';

    } catch (error) {
        statusText.textContent = 'Error loading audio';
        console.error(error);
    }
}

const togglePlayPause = async () => {
    if (audioManager.isPlaying) {
        await audioManager.pause();
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        statusText.textContent = 'Paused';
    } else {
        statusText.textContent = 'Starting...';
        await audioManager.play(audioManager.currentTime);
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        statusText.textContent = 'Playing';
        updateUI();
    }
};

playPauseBtn.addEventListener('click', togglePlayPause);

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
    }
});

waveformContainer.addEventListener('click', async (e) => {
    const relativePos = waveformRenderer.getRelativePosition(e.clientX);
    const seekTime = relativePos * audioManager.duration;

    if (audioManager.isPlaying) {
        statusText.textContent = 'Seeking...';
        await audioManager.play(seekTime);
        statusText.textContent = 'Playing';
    } else {
        playhead.style.left = `${relativePos * 100}%`;
        currentTimeEl.textContent = formatTime(seekTime);
        statusText.textContent = 'Ready';
        audioManager.pauseTime = seekTime;
    }
});

// Processing Event Listeners
lpfFreq.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    lpfVal.textContent = val;
    audioManager.setFilterFreq(val);
});

speedCtrl.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    speedVal.textContent = `${val}x`;
    audioManager.setPlaybackRate(val);
});

pitchShift.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    pitchVal.textContent = val > 0 ? `+${val}` : val;
    audioManager.setPitchShift(val);
});

volumeCtrl.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    volumeVal.textContent = val.toFixed(1);
    audioManager.setVolume(val);
});

audioManager.onEnded = () => {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    statusText.textContent = 'Finished';
};

init();
