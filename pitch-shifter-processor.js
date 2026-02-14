// Basic pitch shifter worklet
// Uses a simple granular approach
class PitchShifterProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{ name: 'pitchRatio', defaultValue: 1.0, minValue: 0.1, maxValue: 8.0 }];
    }

    constructor() {
        super();
        this.grainSize = 1024;
        this.buffer = new Float32Array(this.grainSize * 4);
        this.writePtr = 0;
        this.phase1 = 0;
        this.phase2 = this.grainSize / 2;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        const pitchRatio = parameters.pitchRatio[0];

        if (!input[0]) return true;

        const inputChannel = input[0];
        const outputChannel = output[0];

        for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.writePtr] = inputChannel[i];

            // Grain 1
            const win1 = 0.5 * (1 - Math.cos(2 * Math.PI * this.phase1 / this.grainSize));
            let pos1 = Math.floor(this.writePtr - this.phase1);
            while (pos1 < 0) pos1 += this.buffer.length;
            const sample1 = this.buffer[pos1 % this.buffer.length] * win1;

            // Grain 2
            const win2 = 0.5 * (1 - Math.cos(2 * Math.PI * this.phase2 / this.grainSize));
            let pos2 = Math.floor(this.writePtr - this.phase2);
            while (pos2 < 0) pos2 += this.buffer.length;
            const sample2 = this.buffer[pos2 % this.buffer.length] * win2;

            outputChannel[i] = sample1 + sample2;

            this.writePtr = (this.writePtr + 1) % this.buffer.length;
            this.phase1 = (this.phase1 + pitchRatio) % this.grainSize;
            this.phase2 = (this.phase2 + pitchRatio) % this.grainSize;
        }

        return true;
    }
}

registerProcessor('pitch-shifter-processor', PitchShifterProcessor);
