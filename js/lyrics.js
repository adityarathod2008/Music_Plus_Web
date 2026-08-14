class LyricsSync {
    constructor(audioElement) {
        this.audio = audioElement;
        this.container = document.getElementById('lyrics-content');
        this.currentLyrics = [];
        this.currentIndex = -1;
        
        this.init();
    }

    init() {
        if (!this.container) return;
        
        window.addEventListener('timeupdate', () => this.sync());
    }

    loadLyrics(lyricsData) {
        if (typeof lyricsData === 'string') {
            // Plain text fallback: distribute evenly across song duration for auto-scroll
            const lines = lyricsData.split('\n').filter(l => l.trim().length > 0);
            const duration = this.audio.duration || 180; // fallback to 3 mins
            const timePerLine = duration / (lines.length || 1);
            
            this.currentLyrics = lines.map((text, i) => {
                return { time: i * timePerLine, text: text.trim() };
            });
        } else {
            this.currentLyrics = lyricsData || [];
        }
        
        this.currentIndex = -1;
        this.render();
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        if (this.currentLyrics.length === 0) {
            this.container.innerHTML = '<p class="active-lyric" style="text-align: center; margin-top: 40px; font-weight: 300; opacity: 0.7;">No lyrics available for this song.</p>';
            return;
        }

        // Add padding at top and bottom so first/last lines can reach center
        this.container.style.paddingTop = '50vh';
        this.container.style.paddingBottom = '50vh';

        this.currentLyrics.forEach((line, index) => {
            const p = document.createElement('p');
            p.id = `lyric-line-${index}`;
            p.className = 'lyric-line';
            p.textContent = line.text;
            this.container.appendChild(p);
        });
    }

    sync() {
        if (this.currentLyrics.length === 0) return;
        
        const time = this.audio.currentTime;
        
        // Find the active lyric line
        let activeIndex = -1;
        for (let i = 0; i < this.currentLyrics.length; i++) {
            if (time >= this.currentLyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }
        
        if (activeIndex !== this.currentIndex && activeIndex !== -1) {
            // Remove active class from previous
            if (this.currentIndex !== -1) {
                const prevEl = document.getElementById(`lyric-line-${this.currentIndex}`);
                if (prevEl) prevEl.classList.remove('active-lyric');
            }
            
            // Add active class to current
            this.currentIndex = activeIndex;
            const currentEl = document.getElementById(`lyric-line-${this.currentIndex}`);
            
            if (currentEl) {
                currentEl.classList.add('active-lyric');
                // Scroll into view smoothly
                currentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
}
