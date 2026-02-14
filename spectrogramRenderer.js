export class SpectrogramRenderer {
    constructor(canvas, container, analyser) {
        this.canvas = canvas;
        this.container = container;
        this.ctx = canvas.getContext('2d');
        this.analyser = analyser;

        this.dataArray = new Uint8Array(analyser.frequencyBinCount);

        // Use an offscreen canvas to store history
        this.historyCanvas = document.createElement('canvas');
        this.historyCtx = this.historyCanvas.getContext('2d');

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width * window.devicePixelRatio;
        const height = rect.height * window.devicePixelRatio;

        // Copy existing history
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.historyCanvas.width;
        tempCanvas.height = this.historyCanvas.height;
        tempCanvas.getContext('2d').drawImage(this.historyCanvas, 0, 0);

        this.canvas.width = width;
        this.canvas.height = height;
        this.historyCanvas.width = width;
        this.historyCanvas.height = height;

        this.historyCtx.drawImage(tempCanvas, 0, 0, width, height);
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    update() {
        this.analyser.getByteFrequencyData(this.dataArray);

        const width = this.historyCanvas.width;
        const height = this.historyCanvas.height;

        // Shift history left
        this.historyCtx.drawImage(this.historyCanvas, -2, 0);

        // Draw new column at the right
        const binCount = this.dataArray.length;
        // The analyser.frequencyBinCount covers 0 to sampleRate/2
        // For low frequency discovery, we mostly care about 0-2000Hz
        const sampleRate = this.analyser.context.sampleRate;
        const maxFreq = sampleRate / 2;
        const targetMaxFreq = 2000;
        const maxBin = Math.floor((targetMaxFreq / maxFreq) * binCount);

        for (let i = 0; i < height; i++) {
            // Map height to bins within the target range
            const binIdx = Math.floor((i / height) * maxBin);
            const val = this.dataArray[binIdx];

            // Waterfall colors: Dark Blue -> Blue -> Cyan -> Green -> Yellow -> Red
            let hue;
            if (val < 50) {
                hue = 240; // Dark Blue
            } else {
                hue = Math.max(0, 240 - ((val - 50) / 205) * 240);
            }

            const lightness = val > 0 ? (val / 512 + 15) : 0;
            this.historyCtx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;
            this.historyCtx.fillRect(width - 2, height - i, 2, 1);
        }
    }

    render() {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        this.ctx.drawImage(this.historyCanvas, 0, 0, width, height);
    }
}
