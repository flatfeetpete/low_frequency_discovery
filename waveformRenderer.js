export class WaveformRenderer {
    constructor(canvas, container) {
        this.canvas = canvas;
        this.container = container;
        this.ctx = canvas.getContext('2d');
        this.buffer = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.render();
    }

    setBuffer(buffer) {
        this.buffer = buffer;
        this.render();
    }

    render() {
        if (!this.buffer) return;

        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const data = this.buffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        this.ctx.clearRect(0, 0, width, height);

        // Draw background subtle lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, amp);
        this.ctx.lineTo(width, amp);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#4a9eff';
        this.ctx.lineWidth = 1;

        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            this.ctx.moveTo(i, (1 + min) * amp);
            this.ctx.lineTo(i, (1 + max) * amp);
        }

        this.ctx.stroke();

        // Add a nice gradient overlay
        const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(74, 158, 255, 0.1)');
        gradient.addColorStop(0.5, 'transparent');
        gradient.addColorStop(1, 'rgba(74, 158, 255, 0.1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, width, height);
    }

    getRelativePosition(x) {
        const rect = this.canvas.getBoundingClientRect();
        return (x - rect.left) / rect.width;
    }
}
