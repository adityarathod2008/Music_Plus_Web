class AudioVisualizer {
    constructor(audioPlayer) {
        this.audioPlayer = audioPlayer;
        this.canvas = document.getElementById('visualizer-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.bufferLength = 128;
        this.dataArray = new Uint8Array(this.bufferLength);
        
        this.initialized = false;
        this.mode = 'bars'; // 'bars', 'wave', 'circle'
        this.animationId = null;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        const vizBtn = document.getElementById('viz-mode-btn');
        if (vizBtn) {
            vizBtn.addEventListener('click', () => this.toggleMode());
        }
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this.draw();
    }

    resize() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
    }

    toggleMode() {
        const modes = ['bars', 'wave', 'circle'];
        let idx = modes.indexOf(this.mode);
        this.mode = modes[(idx + 1) % modes.length];
    }

    draw() {
        if (!this.initialized) return;
        
        this.animationId = requestAnimationFrame(() => this.draw());
        
        // FAKE VISUALIZER
        // Since we are using YouTube Iframe API (cross-origin), we cannot read real audio frequencies.
        // We simulate aesthetic visualizer bars when the audio is playing.
        const t = Date.now() / 200;
        const isPlaying = this.audioPlayer && this.audioPlayer.isPlaying;
        
        for (let i = 0; i < this.bufferLength; i++) {
            if (isPlaying) {
                if (this.mode === 'wave') {
                    // Simulate waveform (128 is center)
                    this.dataArray[i] = 128 + (Math.sin(t + i*0.1) * 40) + (Math.random() * 20 - 10);
                } else {
                    // Simulate frequency bars
                    const val = Math.max(0, Math.sin(t + i*0.1) * 150 + Math.random() * 100);
                    this.dataArray[i] = val;
                }
            } else {
                // If paused, decay to 0/center slowly
                if (this.mode === 'wave') {
                    this.dataArray[i] += (128 - this.dataArray[i]) * 0.1;
                } else {
                    this.dataArray[i] *= 0.8;
                }
            }
        }
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.mode === 'bars') {
            this.drawBars();
        } else if (this.mode === 'wave') {
            this.drawWave();
        } else if (this.mode === 'circle') {
            this.drawCircle();
        }
    }

    drawBars() {
        const barWidth = (this.canvas.width / this.bufferLength) * 2.5;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height;
            
            const r = this.dataArray[i] + (25 * (i/this.bufferLength));
            const g = 250 * (i/this.bufferLength);
            const b = 50;
            
            this.ctx.fillStyle = `rgb(${r},${g},${b})`;
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
    }

    drawWave() {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = 'rgb(29, 185, 84)';
        this.ctx.beginPath();
        
        const sliceWidth = this.canvas.width * 1.0 / this.bufferLength;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * this.canvas.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
        this.ctx.stroke();
    }

    drawCircle() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.stroke();
        
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * (radius * 0.8);
            const rads = Math.PI * 2 / this.bufferLength;
            
            const x = centerX + Math.cos(rads * i) * radius;
            const y = centerY + Math.sin(rads * i) * radius;
            const xEnd = centerX + Math.cos(rads * i) * (radius + barHeight);
            const yEnd = centerY + Math.sin(rads * i) * (radius + barHeight);
            
            this.ctx.strokeStyle = `hsl(${(i/this.bufferLength) * 360}, 100%, 50%)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(xEnd, yEnd);
            this.ctx.stroke();
        }
    }
}
