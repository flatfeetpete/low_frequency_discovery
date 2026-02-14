export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.source = null;
        this.startTime = 0;
        this.pauseTime = 0;
        this.isPlaying = false;

        // Processing Nodes
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 1000;

        this.gain = this.ctx.createGain();
        this.gain.gain.value = 1.0;

        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;

        // Pitch Shifter Node (Async creation)
        this.pitchNode = null;
        this.initWorklet();

        // Default Routing (will be fixed once pitchNode is ready)
        // source -> pitchNode? -> filter -> analyser -> gain -> destination
        this.filter.connect(this.analyser);
        this.analyser.connect(this.gain);
        this.gain.connect(this.ctx.destination);

        this.playbackRate = 1.0;
        this.pitchSemitones = 0;

        this.onProgress = null;
        this.onEnded = null;
    }

    async initWorklet() {
        try {
            await this.ctx.audioWorklet.addModule('pitch-shifter-processor.js');
            this.pitchNode = new AudioWorkletNode(this.ctx, 'pitch-shifter-processor');
        } catch (e) {
            console.error('Failed to load pitch-shifter-processor:', e);
        }
    }

    async loadAudio(url) {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            return this.audioBuffer;
        } catch (error) {
            console.error('Error loading audio:', error);
            throw error;
        }
    }

    async play(offset = 0) {
        await this.stop();

        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        this.source = this.ctx.createBufferSource();
        this.source.buffer = this.audioBuffer;
        this.source.playbackRate.value = this.playbackRate;

        // Routing logic
        if (this.pitchNode) {
            this.source.connect(this.pitchNode);
            this.pitchNode.disconnect();
            this.pitchNode.connect(this.filter);

            const ratio = Math.pow(2, this.pitchSemitones / 12);
            this.pitchNode.parameters.get('pitchRatio').setTargetAtTime(ratio, this.ctx.currentTime, 0.01);
        } else {
            this.source.connect(this.filter);
        }

        const currentSource = this.source;
        currentSource.onended = () => {
            if (this.source === currentSource) {
                this.isPlaying = false;
                this.source = null;
                if (this.onEnded) this.onEnded();
            }
        };

        // Note: startTime is calculated in the context's time coordinate
        this.startTime = this.ctx.currentTime - (offset / this.playbackRate);
        this.source.start(0, offset);
        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying) return;
        this.pauseTime = (this.ctx.currentTime - this.startTime) * this.playbackRate;
        this.stop();
    }

    async stop() {
        if (this.source) {
            try {
                this.source.onended = null;
                this.source.stop();
                this.source.disconnect();
            } catch (e) { }
            this.source = null;
        }
        this.isPlaying = false;
    }

    setFilterFreq(freq) {
        this.filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.01);
    }

    setVolume(val) {
        this.gain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.01);
    }

    setPlaybackRate(rate) {
        this.playbackRate = rate;
        if (this.source) {
            this.source.playbackRate.setTargetAtTime(rate, this.ctx.currentTime, 0.01);
        }
    }

    setPitchShift(semitones) {
        this.pitchSemitones = semitones;
        if (this.pitchNode) {
            const ratio = Math.pow(2, semitones / 12);
            this.pitchNode.parameters.get('pitchRatio').setTargetAtTime(ratio, this.ctx.currentTime, 0.01);
        }
    }

    get currentTime() {
        if (this.isPlaying) {
            return (this.ctx.currentTime - this.startTime) * this.playbackRate;
        }
        return this.pauseTime;
    }

    get duration() {
        return this.audioBuffer ? this.audioBuffer.duration : 0;
    }
}
