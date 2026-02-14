export class OscilloscopeRenderer {
    constructor(canvas, container, analyser) {
        this.canvas = canvas;
        this.container = container;
        this.ctx = canvas.getContext('2d');
        this.analyser = analyser;

        // Window size in seconds
        this.windowSeconds = 3;
        const sampleRate = analyser.context.sampleRate;
        this.bufferLength = Math.floor(this.windowSeconds * sampleRate);
        this.buffer = new Float32Array(this.bufferLength);
        this.writePointer = 0;

        this.dataArray = new Float32Array(analyser.fftSize);

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    update() {
        // Get current time domain data
        this.analyser.getFloatTimeDomainData(this.dataArray);

        // Append to circular buffer
        for (let i = 0; i < this.dataArray.length; i++) {
            this.buffer[this.writePointer] = this.dataArray[i];
            this.writePointer = (this.writePointer + 1) % this.bufferLength;
        }
    }

    render() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const midY = height / 2;

        this.ctx.clearRect(0, 0, width, height);

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#4a9eff';
        this.ctx.lineWidth = 1.5;
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = 'rgba(74, 158, 255, 0.5)';

        const step = Math.floor(this.bufferLength / width);

        for (let i = 0; i < width; i++) {
            // Calculate index in circular buffer
            // We want to show the most recent data at the right
            let idx = (this.writePointer - this.bufferLength + (i * step)) % this.bufferLength;
            if (idx < 0) idx += this.bufferLength;

            const val = this.buffer[idx];
            const y = midY + val * midY;

            if (i === 0) {
                this.ctx.moveTo(i, y);
            } else {
                this.ctx.lineTo(i, y);
            }
        }

        this.ctx.stroke();

        // Reset shadow for performance
        this.ctx.shadowBlur = 0;
    }
}
