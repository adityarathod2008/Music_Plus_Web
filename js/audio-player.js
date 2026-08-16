class AudioPlayer {
    constructor() {
        this.isPlaying = false;
        this.isMuted = false;
        this.currentSongIndex = 0;
        this.queue = [];
        this.shuffle = false;
        this.repeat = 'none'; // 'none', 'all', 'one'
        this.volume = 1;
        this.duration = 0;
        
        // DOM Elements
        this.playPauseBtn = document.getElementById('play-pause-btn');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.shuffleBtn = document.getElementById('shuffle-btn');
        this.repeatBtn = document.getElementById('repeat-btn');
        this.muteBtn = document.getElementById('mute-btn');
        
        this.progressBarBg = document.getElementById('progress-area');
        this.progressBarFill = document.getElementById('progress-bar');
        this.currentTimeEl = document.getElementById('current-time');
        this.totalTimeEl = document.getElementById('total-time');
        
        this.volumeBarBg = document.getElementById('volume-area');
        this.volumeBarFill = document.getElementById('volume-bar');
        
        this.trackCover = document.getElementById('track-cover');
        this.trackTitle = document.getElementById('track-title');
        this.trackArtist = document.getElementById('track-artist');
        this.trackCover = document.getElementById('track-cover');
        this.audioConsoleMeta = document.getElementById('audio-console-metadata');
        this.trackVibe = document.getElementById('track-vibe');
        this.trackEnergy = document.getElementById('track-energy');
        
        this.drawerCover = document.getElementById('drawer-cover');
        this.drawerTitle = document.getElementById('drawer-title');
        this.drawerArtist = document.getElementById('drawer-artist');
        
        this.onSongChangeCallbacks = [];
        this.timeUpdateInterval = null;
        
        // Wait for YT API
        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player('yt-player', {
                height: '0',
                width: '0',
                videoId: '',
                playerVars: {
                    'autoplay': 0,
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'playsinline': 1
                },
                events: {
                    'onReady': (e) => this.onPlayerReady(e),
                    'onStateChange': (e) => this.onPlayerStateChange(e),
                    'onError': (e) => this.onPlayerError(e)
                }
            });
        };
        
        // In case YT API is already loaded
        if (window.YT && window.YT.Player) {
            window.onYouTubeIframeAPIReady();
        }
    }

    get currentTime() {
        return this.ytPlayer ? this.ytPlayer.getCurrentTime() || 0 : 0;
    }

    onPlayerReady(event) {
        this.init();
    }
    
    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            this.duration = this.ytPlayer.getDuration();
            this.totalTimeEl.textContent = this.formatTime(this.duration);
            this.endTriggered = false; // Reset the flag when playback starts
            
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'playing';
            }
            
            if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = setInterval(() => {
                this.updateProgress();
                window.dispatchEvent(new Event('timeupdate'));
                const currentTime = this.ytPlayer.getCurrentTime();
                
                // Manually trigger end if YT player fails to fire ENDED event
                if (this.duration > 0 && currentTime >= this.duration - 1) {
                    if (!this.endTriggered) {
                        this.endTriggered = true;
                        this.handleSongEnd();
                    }
                }
                
                if (Math.floor(currentTime) % 5 === 0) {
                    this.saveSession();
                }
            }, 500);
            
        } else if (event.data === YT.PlayerState.PAUSED) {
            this.isPlaying = false;
            this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (this.timeUpdateInterval) clearInterval(this.timeUpdateInterval);
            
            if ('mediaSession' in navigator) {
                navigator.mediaSession.playbackState = 'paused';
            }
            
        } else if (event.data === YT.PlayerState.ENDED) {
            if (!this.endTriggered) {
                this.endTriggered = true;
                this.handleSongEnd();
            }
            
        } else if (event.data === YT.PlayerState.BUFFERING) {
            this.playPauseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
    }
    
    onPlayerError(event) {
        console.error("YouTube Player Error:", event.data);
        setTimeout(() => this.playNext(), 2000);
    }

    init() {
        // Event Listeners
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.nextBtn.addEventListener('click', () => this.playNext());
        this.prevBtn.addEventListener('click', () => this.playPrev());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.muteBtn.addEventListener('click', () => this.toggleMute());

        this.progressBarBg.addEventListener('click', (e) => this.seek(e));
        this.volumeBarBg.addEventListener('click', (e) => this.setVolume(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT') return;
            if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
            if (e.code === 'ArrowRight') { 
                const ct = this.ytPlayer.getCurrentTime() || 0;
                this.ytPlayer.seekTo(ct + 5, true); 
            }
            if (e.code === 'ArrowLeft') { 
                const ct = this.ytPlayer.getCurrentTime() || 0;
                this.ytPlayer.seekTo(ct - 5, true); 
            }
            if (e.code === 'ArrowUp') { 
                this.volume = Math.min(1, this.volume + 0.1); 
                this.ytPlayer.setVolume(this.volume * 100); 
                this.updateVolumeUI(); 
            }
            if (e.code === 'ArrowDown') { 
                this.volume = Math.max(0, this.volume - 0.1); 
                this.ytPlayer.setVolume(this.volume * 100); 
                this.updateVolumeUI(); 
            }
        });
        
        // Initial volume
        this.ytPlayer.setVolume(this.volume * 100);
        
        // Initialize Session or Default Queue
        this.loadSession();
    }
    
    saveSession() {
        if (!this.queue || this.queue.length === 0 || !this.ytPlayer) return;
        try {
            const sessionData = {
                queue: this.queue,
                currentIndex: this.currentSongIndex,
                currentTime: this.ytPlayer.getCurrentTime() || 0,
                timestamp: Date.now()
            };
            localStorage.setItem('musicplus_session', JSON.stringify(sessionData));
        } catch(e) {}
    }
    
    loadSession() {
        const savedSession = localStorage.getItem('musicplus_session');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.queue && session.queue.length > 0) {
                    this.queue = session.queue;
                    this.currentSongIndex = session.currentIndex || 0;
                    
                    const timeToRestore = session.currentTime || 0;
                    const song = this.queue[this.currentSongIndex];
                    if (song) {
                        this.loadSong(song, timeToRestore);
                    }
                    
                    if (typeof renderQueue === 'function') {
                        renderQueue();
                    }
                    return;
                }
            } catch (e) {
                console.error("Failed to load session", e);
            }
        }
        
        // Fallback to default behavior if no session
        this.queue = [...songs];
        if(this.queue.length > 0) {
            this.loadSong(this.queue[0]);
        }
    }

    loadSong(song, startSeconds = 0, autoplay = false) {
        if(!song || !this.ytPlayer) return;
        
        if (song.id.startsWith('s')) {
            // Local fallback song - skip it
            this.playNext();
            return;
        }

        if (autoplay) {
            this.ytPlayer.loadVideoById({videoId: song.id, startSeconds: startSeconds});
        } else {
            this.ytPlayer.cueVideoById({videoId: song.id, startSeconds: startSeconds});
        }
        
        this.trackTitle.textContent = song.title;
        this.trackArtist.textContent = song.artist;
        this.trackCover.src = song.cover;
        
        this.drawerTitle.textContent = song.title;
        this.drawerArtist.textContent = song.artist;
        this.drawerCover.src = song.cover;
        
        if (this.audioConsoleMeta && this.trackVibe && this.trackEnergy) {
            this.audioConsoleMeta.style.display = 'block';
            setTimeout(() => this.audioConsoleMeta.style.opacity = '1', 50);
            
            // Derive some mock aesthetic data if not present in track metadata
            const vibe = song.genre || song.mood || 'CHILL';
            const energy = song.bpm ? Math.min(100, Math.round((song.bpm / 160) * 100)) + '%' : (Math.floor(Math.random() * 50) + 40) + '%';
            
            this.trackVibe.textContent = vibe.toUpperCase();
            this.trackEnergy.textContent = energy;
        }
        
        const bgColor = song.color || '#1DB954';
        this.dynamicBg.style.background = `linear-gradient(to bottom, ${bgColor}, var(--bg-color-base))`;
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.title,
                artist: song.artist,
                album: song.album || 'Music+',
                artwork: [
                    { src: song.cover, sizes: '512x512', type: 'image/jpeg' }
                ]
            });
            
            navigator.mediaSession.setActionHandler('play', () => { if(!this.isPlaying) this.togglePlay(); });
            navigator.mediaSession.setActionHandler('pause', () => { if(this.isPlaying) this.togglePlay(); });
            navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
            navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if(this.ytPlayer) this.ytPlayer.seekTo(details.seekTime, true);
            });
            navigator.mediaSession.setActionHandler('seekforward', (details) => {
                if(this.ytPlayer) {
                    const ct = this.ytPlayer.getCurrentTime() || 0;
                    this.ytPlayer.seekTo(ct + (details.seekOffset || 10), true);
                }
            });
            navigator.mediaSession.setActionHandler('seekbackward', (details) => {
                if(this.ytPlayer) {
                    const ct = this.ytPlayer.getCurrentTime() || 0;
                    this.ytPlayer.seekTo(Math.max(ct - (details.seekOffset || 10), 0), true);
                }
            });
        }
        
        this.onSongChangeCallbacks.forEach(cb => cb(song));
    }

    playSong(song, index) {
        if (song) {
            this.currentSongIndex = index;
            this.loadSong(song, 0, true);
            this.addToListeningHistory(song);
        }
    }

    togglePlay() {
        if (!this.ytPlayer || this.queue.length === 0) return;
        if (this.isPlaying) {
            this.ytPlayer.pauseVideo();
        } else {
            this.ytPlayer.playVideo();
        }
    }

    async playNext() {
        if (this.queue.length === 0) return;
        
        if (this.shuffle) {
            let randomIndex = this.currentSongIndex;
            while(randomIndex === this.currentSongIndex && this.queue.length > 1) {
                randomIndex = Math.floor(Math.random() * this.queue.length);
            }
            this.currentSongIndex = randomIndex;
            this.playSong(this.queue[this.currentSongIndex], this.currentSongIndex);
        } else {
            this.currentSongIndex++;
            if (this.queue.length - this.currentSongIndex <= 10) {
                this.bufferUpcomingSongs();
            }
            
            if (this.currentSongIndex >= this.queue.length) {
                this.playPauseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                await this.bufferUpcomingSongs();
            }
            
            this.playSong(this.queue[this.currentSongIndex], this.currentSongIndex);
            this.saveSession();
        }
    }
    
    addToListeningHistory(song) {
        try {
            let history = JSON.parse(localStorage.getItem('listeningHistory') || '[]');
            history = history.filter(s => s.id !== song.id);
            history.unshift(song);
            if (history.length > 50) history.pop();
            localStorage.setItem('listeningHistory', JSON.stringify(history));
            
            if (window.musicRecommendationEngine) {
                window.musicRecommendationEngine.recordEvent('TRACK_COMPLETED', song);
            }
            window.dispatchEvent(new CustomEvent('listeningHistoryUpdated'));
        } catch(e) {}
    }

    async bufferUpcomingSongs() {
        if (this.isBufferingQueue) return;
        this.isBufferingQueue = true;
        
        try {
            const lastSong = this.queue[this.queue.length - 1] || this.queue[this.currentSongIndex];
            
            if (lastSong && lastSong.id && !lastSong.id.startsWith('s')) {
                const response = await fetch(`${BACKEND_URL}/related?video_id=${lastSong.id}`);
                const data = await response.json();
                
                if (data.results && data.results.length > 0) {
                    const existingIds = new Set(this.queue.map(s => s.id));
                    const newSongs = data.results.filter(s => !existingIds.has(s.id));
                    
                    const songsToAdd = newSongs.slice(0, 10);
                    for (const song of songsToAdd) {
                        this.queue.push(song);
                    }
                }
            } else {
                const response = await fetch(`${BACKEND_URL}/search?q=trending+music`);
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    for (const song of data.results.slice(0, 5)) {
                        this.queue.push(song);
                    }
                }
            }
        } catch (err) {
            console.error("Queue buffer failed", err);
        } finally {
            this.isBufferingQueue = false;
            if (typeof renderQueue === 'function') {
                renderQueue();
            }
            this.saveSession();
        }
    }

    playPrev() {
        const ct = this.ytPlayer ? this.ytPlayer.getCurrentTime() : 0;
        if (ct > 3) {
            if (this.ytPlayer) this.ytPlayer.seekTo(0, true);
            return;
        }
        this.currentSongIndex--;
        if (this.currentSongIndex < 0) {
            this.currentSongIndex = this.queue.length - 1;
        }
        this.playSong(this.queue[this.currentSongIndex], this.currentSongIndex);
    }

    handleSongEnd() {
        if (this.repeat === 'one') {
            this.ytPlayer.seekTo(0, true);
            this.ytPlayer.playVideo();
        } else if (this.repeat === 'all' && this.currentSongIndex === this.queue.length - 1) {
            this.currentSongIndex = 0;
            this.playSong(this.queue[0], 0);
        } else {
            this.playNext();
        }
    }

    toggleShuffle() {
        this.shuffle = !this.shuffle;
        this.shuffleBtn.classList.toggle('active', this.shuffle);
    }

    toggleRepeat() {
        if (this.repeat === 'none') {
            this.repeat = 'all';
            this.repeatBtn.classList.add('active');
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        } else if (this.repeat === 'all') {
            this.repeat = 'one';
            this.repeatBtn.classList.add('active');
            this.repeatBtn.innerHTML = '<i class="fas fa-redo" style="position:relative"><span style="position:absolute; font-size:8px; top:50%; left:50%; transform:translate(-50%,-50%); font-weight:bold; background:#000; border-radius:50%; width:12px; height:12px; display:flex; align-items:center; justify-content:center;">1</span></i>';
        } else {
            this.repeat = 'none';
            this.repeatBtn.classList.remove('active');
            this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
        }
    }

    updateProgress() {
        if (!this.ytPlayer || !this.duration) return;
        
        const currentTime = this.ytPlayer.getCurrentTime() || 0;
        const progressPercent = (currentTime / this.duration) * 100;
        this.progressBarFill.style.width = `${progressPercent}%`;
        this.currentTimeEl.textContent = this.formatTime(currentTime);

        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: this.duration,
                    playbackRate: this.ytPlayer.getPlaybackRate() || 1,
                    position: currentTime
                });
            } catch (e) {}
        }
    }

    seek(e) {
        if (!this.ytPlayer || !this.duration) return;
        const width = this.progressBarBg.clientWidth;
        const clickX = e.offsetX;
        const seekTime = (clickX / width) * this.duration;
        this.ytPlayer.seekTo(seekTime, true);
    }

    toggleMute() {
        if (!this.ytPlayer) return;
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.ytPlayer.mute();
            this.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            this.volumeBarFill.style.width = '0%';
        } else {
            this.ytPlayer.unMute();
            this.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.updateVolumeUI();
        }
    }

    setVolume(e) {
        if (!this.ytPlayer) return;
        const width = this.volumeBarBg.clientWidth;
        const clickX = e.offsetX;
        this.volume = clickX / width;
        this.ytPlayer.setVolume(this.volume * 100);
        this.isMuted = false;
        this.ytPlayer.unMute();
        this.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        this.updateVolumeUI();
    }

    updateVolumeUI() {
        this.volumeBarFill.style.width = `${this.volume * 100}%`;
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    onSongChange(cb) {
        this.onSongChangeCallbacks.push(cb);
    }
}
