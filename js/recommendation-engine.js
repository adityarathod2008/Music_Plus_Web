// recommendation-engine.js

class RecommendationEngine {
    constructor() {
        this.profile = this.loadProfile();
    }

    loadProfile() {
        const stored = localStorage.getItem('UserListeningProfile');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse UserListeningProfile", e);
            }
        }
        return {
            artists: {}, // { artistName: score }
            genres: {},
            moods: {},
            history: [], // recent tracks played
            lastUpdate: Date.now()
        };
    }

    saveProfile() {
        localStorage.setItem('UserListeningProfile', JSON.stringify(this.profile));
    }

    recordEvent(eventType, track, additionalMetadata = {}) {
        if (!track) return;
        
        let weight = 0;
        switch(eventType) {
            case 'TRACK_COMPLETED': weight = 5; break;
            case 'TRACK_REPLAYED': weight = 4; break;
            case 'TRACK_LIKED': weight = 8; break;
            case 'TRACK_SKIPPED': weight = -5; break;
            case 'MOOD_SELECTED': weight = 4; break;
            default: weight = 1;
        }

        // Apply decay to existing scores
        this._decayScores();

        // Update Artist Affinity
        if (track.artist) {
            this.profile.artists[track.artist] = (this.profile.artists[track.artist] || 0) + weight;
        }

        // Update Genre Affinity
        if (track.genre) {
            this.profile.genres[track.genre] = (this.profile.genres[track.genre] || 0) + weight;
        }

        // Update History
        if (eventType !== 'TRACK_SKIPPED' && weight > 0) {
            this.profile.history.unshift(track);
            // keep only last 50
            if (this.profile.history.length > 50) this.profile.history.pop();
        }

        this.profile.lastUpdate = Date.now();
        this.saveProfile();
    }

    _decayScores() {
        const now = Date.now();
        const daysSinceUpdate = (now - this.profile.lastUpdate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 1) return; // Only decay once a day

        const decayFactor = Math.pow(0.95, daysSinceUpdate); // 5% decay per day

        for (let artist in this.profile.artists) {
            this.profile.artists[artist] *= decayFactor;
        }
        for (let genre in this.profile.genres) {
            this.profile.genres[genre] *= decayFactor;
        }
    }

    _getTopKeys(obj, limit = 3) {
        return Object.entries(obj)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);
    }

    getQuickAccess(allSongs) {
        // Quick access answers "What does the user probably want right now?"
        const topArtists = this._getTopKeys(this.profile.artists, 2);
        const topGenres = this._getTopKeys(this.profile.genres, 1);
        
        // Find matching tracks
        let recommended = allSongs.filter(s => 
            topArtists.includes(s.artist) || topGenres.includes(s.genre)
        );
        
        // Mix with recent history
        const recents = this.profile.history.slice(0, 3);
        
        // Deduplicate and randomize slightly
        const mergedMap = new Map();
        [...recents, ...recommended].forEach(s => mergedMap.set(s.id, s));
        const merged = Array.from(mergedMap.values());
        
        return merged.sort(() => 0.5 - Math.random()).slice(0, 6);
    }

    getMadeForYou(allSongs) {
        // 70% familiar/relevant, 30% discovery
        const topArtists = this._getTopKeys(this.profile.artists, 5);
        const topGenres = this._getTopKeys(this.profile.genres, 3);

        const relevant = allSongs.filter(s => topArtists.includes(s.artist) || topGenres.includes(s.genre));
        const discovery = allSongs.filter(s => !topArtists.includes(s.artist) && !topGenres.includes(s.genre));

        // Shuffle
        relevant.sort(() => 0.5 - Math.random());
        discovery.sort(() => 0.5 - Math.random());

        const finalMix = [
            ...relevant.slice(0, 4),
            ...discovery.slice(0, 2)
        ];

        // If not enough data, just return random
        if (finalMix.length < 6) {
             return [...allSongs].sort(() => 0.5 - Math.random()).slice(0, 6);
        }

        return finalMix.sort(() => 0.5 - Math.random());
    }
}

window.musicRecommendationEngine = new RecommendationEngine();

window.initializeRecommendations = function() {
    // We update the home page with dynamic recommendations instead of static slices
    if (typeof populateHome === 'function' && typeof songs !== 'undefined' && songs.length > 0) {
        // Find the Quick Access section and overwrite
        const quickGrid = document.getElementById('quick-play-grid');
        if (quickGrid) {
            quickGrid.innerHTML = '';
            const qaSongs = window.musicRecommendationEngine.getQuickAccess(songs);
            // Fallback if empty
            const renderSongs = qaSongs.length > 0 ? qaSongs : songs.slice(0, 6);
            
            renderSongs.forEach((song, i) => {
                const card = document.createElement('div');
                card.className = 'quick-card';
                card.innerHTML = `
                    <img src="${song.cover}" alt="cover" loading="lazy" onerror="window.handleImageError(this, '${song.title}', 'song')">
                    <h4 class="card-title">${song.title}</h4>
                    <button class="quick-play-btn"><i class="fas fa-play"></i></button>
                `;
                
                // Clicking quick card plays it
                card.addEventListener('click', () => { 
                    if (!song.src) song.src = `${BACKEND_URL}/stream/${song.id}`;
                    if (window.audioPlayer) {
                        window.audioPlayer.queue = [song]; 
                        window.audioPlayer.playSong(song, 0); 
                    }
                });
                quickGrid.appendChild(card);
            });
        }
        
        // Find Made For You section and overwrite
        const madeForYou = document.getElementById('made-for-you');
        if (madeForYou) {
            madeForYou.innerHTML = '';
            const mfySongs = window.musicRecommendationEngine.getMadeForYou(songs);
            
            mfySongs.forEach((song, i) => {
                const row = document.createElement('div');
                row.className = 'trending-row';
                const duration = song.duration ? `<p>${song.duration}</p>` : '';
                
                row.innerHTML = `
                    <div class="rank">${(i + 1).toString().padStart(2, '0')}</div>
                    <img src="${song.cover}" alt="cover" loading="lazy" onerror="window.handleImageError(this, '${song.title}', 'song')">
                    <div class="trending-row-info" style="cursor:pointer">
                        <h4 class="card-title">${song.title}</h4>
                        <p>${song.artist}</p>
                    </div>
                    ${duration}
                    <div class="trending-row-actions">
                        <button class="trend-like-btn" title="Like"><i class="far fa-heart"></i></button>
                        <button title="More"><i class="fas fa-ellipsis-h"></i></button>
                    </div>
                `;
                
                row.querySelector('.trending-row-info').addEventListener('click', () => {
                     if (window.renderTrackDetail) {
                         window.renderTrackDetail(song, mfySongs);
                     }
                });
                
                row.addEventListener('click', (e) => {
                    if(e.target.closest('button') || e.target.closest('.trending-row-info')) return;
                    if (!song.src) song.src = `${BACKEND_URL}/stream/${song.id}`;
                    if (window.audioPlayer) {
                        window.audioPlayer.queue = [song]; 
                        window.audioPlayer.playSong(song, 0); 
                    }
                });
                madeForYou.appendChild(row);
            });
        }
    }
};
