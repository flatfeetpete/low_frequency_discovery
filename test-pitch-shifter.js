// Simulate the PitchShifterProcessor in a Node environment
// This helps verify the logic without a full AudioWorklet environment

class SimulationPitchShifter {
    constructor(grainSize = 2048) {
        this.grainSize = grainSize;
        this.buffer = new Float32Array(this.grainSize * 4);
        this.writePtr = 0;
        this.readPtr1 = 0;
        this.readPtr2 = this.grainSize / 2;
    }

    process(input, pitchRatio) {
        const output = new Float32Array(input.length);

        for (let i = 0; i < input.length; i++) {
            this.buffer[this.writePtr] = input[i];

            // Grain 1
            const win1 = 0.5 * (1 - Math.cos(2 * Math.PI * (this.readPtr1 % this.grainSize) / this.grainSize));
            const pos1 = (this.writePtr - Math.floor(this.readPtr1) + this.buffer.length) % this.buffer.length;
            const sample1 = this.buffer[pos1] * win1;

            // Grain 2 (offset by half grain size)
            const win2 = 0.5 * (1 - Math.cos(2 * Math.PI * (this.readPtr2 % this.grainSize) / this.grainSize));
            const pos2 = (this.writePtr - Math.floor(this.readPtr2) + this.buffer.length) % this.buffer.length;
            const sample2 = this.buffer[pos2] * win2;

            output[i] = sample1 + sample2;

            this.writePtr = (this.writePtr + 1) % this.buffer.length;
            this.readPtr1 = (this.readPtr1 + pitchRatio);
            this.readPtr2 = (this.readPtr2 + pitchRatio);
        }
        return output;
    }
}

// Test
const shifter = new SimulationPitchShifter(1024);
const input = new Float32Array(4096).fill(1.0); // Constant 1.0 signal
const output = shifter.process(input, 2.0);

console.log('Input samples (first 10):', input.slice(0, 10));
console.log('Output samples (first 10):', output.slice(0, 10));

let zeroCount = 0;
for (let x of output) if (x === 0) zeroCount++;
console.log(`Zero count in output: ${zeroCount} / ${output.length}`);

// Test with a sine wave
const sineInput = new Float32Array(4096);
for (let i = 0; i < 4096; i++) sineInput[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
const sineOutput = shifter.process(sineInput, 2.0);
console.log('Sine Output (first 10):', sineOutput.slice(0, 10));
