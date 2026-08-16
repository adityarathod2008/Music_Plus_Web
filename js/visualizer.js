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
        
        // Audio-Reactive Environment glow
        if (isPlaying) {
            let avg = 0;
            for(let i=0; i<this.bufferLength; i++) { avg += this.dataArray[i]; }
            avg = avg / this.bufferLength;
            // Depending on mode, the max expected value changes. 
            // In bars mode it is up to 255. In wave it centers at 128.
            let normalized = 0;
            if (this.mode === 'wave') {
                normalized = Math.min(1, Math.abs(avg - 128) / 64);
            } else {
                normalized = Math.min(1, avg / 128);
            }
            document.documentElement.style.setProperty('--glow-intensity', (0.1 + normalized * 0.4).toFixed(2));
        } else {
            document.documentElement.style.setProperty('--glow-intensity', '0.1');
        }
        
        // Cyber-industrial dark background with trailing effect
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'rgba(5, 5, 5, 0.25)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add additive blending for glowing effect
        this.ctx.globalCompositeOperation = 'screen';
        
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
            
            // Neon cyan to purple gradient
            const r = (this.dataArray[i] / 255) * 255;
            const g = 255 - (i / this.bufferLength) * 100;
            const b = 204 + (i / this.bufferLength) * 51;
            
            this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
            
            // Add a glow by drawing a slightly larger, fainter rect behind
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
            
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth - 1, barHeight);
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
            
            x += barWidth;
        }
    }

    drawWave() {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#00ffcc';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00ffcc';
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
        this.ctx.shadowBlur = 0; // Reset
    }

    drawCircle() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 40;
        
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * (radius * 0.8);
            const rads = Math.PI * 2 / this.bufferLength;
            
            const x = centerX + Math.cos(rads * i) * radius;
            const y = centerY + Math.sin(rads * i) * radius;
            const xEnd = centerX + Math.cos(rads * i) * (radius + barHeight);
            const yEnd = centerY + Math.sin(rads * i) * (radius + barHeight);
            
            this.ctx.strokeStyle = `hsla(${160 + (i/this.bufferLength) * 60}, 100%, 50%, 0.8)`;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = this.ctx.strokeStyle;
            this.ctx.lineWidth = 3;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(xEnd, yEnd);
            this.ctx.stroke();
        }
        this.ctx.shadowBlur = 0;
    }
}
