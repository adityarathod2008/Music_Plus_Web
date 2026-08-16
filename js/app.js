document.addEventListener('DOMContentLoaded', async () => {
    // Initialize components
    const audioPlayer = new AudioPlayer();
    const visualizer = new AudioVisualizer(audioPlayer);
    const lyricsSync = new LyricsSync(audioPlayer);
    
    // UI Elements
    const app = document.getElementById('app');
    const visualizerBtn = document.getElementById('visualizer-btn');
    const lyricsBtn = document.getElementById('lyrics-btn');
    const queueBtn = document.getElementById('queue-btn');
    const closeDrawerBtn = document.getElementById('close-drawer');
    const drawerTitle = document.getElementById('drawer-view-title');
    
    const vizDrawer = document.getElementById('drawer-visualizer');
    const lyricsDrawer = document.getElementById('lyrics-drawer');
    const queueDrawer = document.getElementById('queue-drawer');
    const nowPlayingDrawer = document.getElementById('now-playing-drawer');
    
    // View navigation
    const navLinks = document.querySelectorAll('.nav-links li');
    const views = document.querySelectorAll('.view-container');
    const adminNav = document.getElementById('admin-nav');
    
    // Search
    const searchInput = document.getElementById('search-input');
    const searchContainer = document.getElementById('search-container');
    const searchResultsContainer = document.getElementById('search-results-container');
    const searchResultsList = document.getElementById('search-results-list');
    let searchTimeout = null;
    let currentSearchResults = [];
    
    // Auth Elements
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userAvatar = document.getElementById('user-avatar');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authToggleLink = document.getElementById('auth-toggle-link');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authError = document.getElementById('auth-error');
    const usernameGroup = document.getElementById('username-group');
    const emailInput = document.getElementById('auth-email');
    const usernameInput = document.getElementById('auth-username');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    
    // State
    let isLoginMode = true;
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    let usersDB = JSON.parse(localStorage.getItem('usersDB') || '[]');
    let likedSongs = currentUser ? (currentUser.likedSongs || []) : [];
    
    // Seed Admin Account if it doesn't exist, and force reset password
    const adminUser = usersDB.find(u => u.email === 'admin@musicplus.com');
    if (!adminUser) {
        usersDB.push({
            id: 'admin_1',
            email: 'admin@musicplus.com',
            username: 'Admin',
            password: 'admin123',
            status: 'approved',
            likedSongs: []
        });
        localStorage.setItem('usersDB', JSON.stringify(usersDB));
    }
    
    // Seed Demo Account
    const demoUser = usersDB.find(u => u.email === 'demo@musicplus.com');
    if (!demoUser) {
        usersDB.push({
            id: 'demo_1',
            email: 'demo@musicplus.com',
            username: 'Demo User',
            password: 'demo123',
            status: 'approved',
            likedSongs: []
        });
        localStorage.setItem('usersDB', JSON.stringify(usersDB));
    } else {
        // Force reset password for locked out user
        adminUser.password = 'admin123';
        localStorage.setItem('usersDB', JSON.stringify(usersDB));
    }
    
    // Also reset if currently logged in
    if (currentUser && currentUser.email === 'admin@musicplus.com') {
        currentUser.password = 'admin123';
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    const playerLikeBtn = document.getElementById('player-like-btn');
    const drawerLikeBtn = document.querySelector('.drawer-like');
    const uploadBtn = document.getElementById('upload-local');
    const fileInput = document.getElementById('file-upload');
    let currentActiveSong = null;
    let uiInitialized = false;
    
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
    
    await initData();
    initUI();
    
    async function initData() {
        document.getElementById('greeting').textContent = "Fetching Trending Music...";
        await fetchUsersFromBackend();
        await loadTrendingSongs();
        await loadMadeForYou();
        await loadTopArtists();
        await loadPopularPlaylists();
        updateGreeting();
        renderAppWhenReady();
    }
    
    function renderAppWhenReady() {
        if (currentUser && !uiInitialized && songs.length > 0) {
            populateHome();
            populateGenres();
            updatePlaylists();
            renderSearchHistory();
            
            // Hero Actions Wiring
            const heroPlayBtn = document.querySelector('.hero-play-btn');
            const heroAddBtn = document.querySelector('.hero-add-btn');
            if (heroPlayBtn) {
                heroPlayBtn.addEventListener('click', () => {
                    if (songs.length > 0) {
                        const firstSong = songs[0];
                        if (!firstSong.src) firstSong.src = `${BACKEND_URL}/stream/${firstSong.id}`;
                        audioPlayer.queue = [...songs];
                        audioPlayer.playSong(firstSong, 0);
                        audioPlayer.bufferUpcomingSongs();
                    }
                });
            }
            if (heroAddBtn) {
                heroAddBtn.addEventListener('click', () => {
                    if (songs.length > 0) {
                        const firstSong = songs[0];
                        if (!likedSongs.find(s => s.id === firstSong.id)) {
                            likedSongs.push(firstSong);
                            saveLikedSongs();
                            heroAddBtn.innerHTML = '<i class="fas fa-check"></i> Added';
                            heroAddBtn.style.background = 'var(--text-base)';
                            heroAddBtn.style.color = 'black';
                        }
                    }
                });
            }
            uiInitialized = true;
        }
    }
    
    async function loadTopArtists() {
        const artistsList = [
            { name: "Arijit Singh", browseId: "UCDxKh1gFWeYsqePvgVzmPoQ", image: "https://i.scdn.co/image/ab6761610000e5eb0261696c5df3be99da6ed3f3" },
            { name: "Taylor Swift", browseId: "UCPC0L1d253x-KuMNwa05TpA", image: "https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0" },
            { name: "Shreya Ghoshal", browseId: "UCrC-7fsdTCYeaRBpwA6j-Eg", image: "https://upload.wikimedia.org/wikipedia/commons/2/29/Shreya_Ghoshal_at_the_61st_Filmfare_Awards.jpg" },
            { name: "The Weeknd", browseId: "UClYV6hHlupm_S_ObS1W-DYw", image: "https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb" },
            { name: "Pritam", browseId: "UCCTN01plFzn4npREHKT2_9Q", image: "https://i.scdn.co/image/ab6761610000e5ebcb6926f44f620555ba444fca" },
            { name: "Ed Sheeran", browseId: "UClmXPfaYhXOYsNn_QUyheWQ", image: "https://i.scdn.co/image/ab6761610000e5eb12a2ef08d00dd7451a6dbed6" }
        ];
        
        const container = document.getElementById('top-artists');
        if (!container) return;
        document.getElementById('top-artists-section').style.display = 'block';
        container.innerHTML = '';
        
        artistsList.forEach(artist => {
            const card = document.createElement('div');
            card.className = 'artist-card';
            card.innerHTML = `
                <img src="${artist.image}" alt="${artist.name}" loading="lazy">
                <h4>${artist.name}</h4>
                <p>Artist</p>
            `;
            card.addEventListener('click', () => {
                loadArtistProfile(artist.browseId, artist.image);
            });
            container.appendChild(card);
        });
    }

    async function loadPopularPlaylists() {
        document.getElementById('popular-playlists-section').style.display = 'block';
        const container = document.getElementById('popular-playlists');
        container.innerHTML = '<div class="loading-spinner" style="padding: 20px;">Fetching Playlists...</div>';
        
        try {
            const queries = ["Bollywood Hits", "Workout Music", "Chill Vibes", "Top 50 Global"];
            const randomQuery = queries[Math.floor(Math.random() * queries.length)];
            
            document.querySelector('#popular-playlists-section h2').textContent = randomQuery;
            
            const response = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(randomQuery)}`);
            const data = await response.json();
            
            container.innerHTML = '';
            if (data.results && data.results.length > 0) {
                data.results.slice(0, 6).forEach((song, index) => {
                    const card = createMusicCard(song, index, data.results);
                    container.appendChild(card);
                });
            } else {
                document.getElementById('popular-playlists-section').style.display = 'none';
            }
        } catch (e) {
            console.error("Failed to load playlists", e);
            document.getElementById('popular-playlists-section').style.display = 'none';
        }
    }
    
    async function loadMadeForYou() {
        let history = JSON.parse(localStorage.getItem('listeningHistory') || '[]');
        if (currentUser && currentUser.playHistory) {
            history = [...history, ...currentUser.playHistory];
        }
        
        let likes = currentUser ? (currentUser.likedSongs || []) : [];
        let combinedPool = [...history, ...likes];
        
        const dynamicContainer = document.getElementById('dynamic-shelves-container');
        if (dynamicContainer) dynamicContainer.innerHTML = '';
        
        if (combinedPool.length > 0) {
            document.getElementById('made-for-you-section').style.display = 'block';
            const container = document.getElementById('personalized-mix');
            container.innerHTML = '<div class="loading-spinner" style="padding: 20px;">Generating your mix...</div>';
            
            try {
                const uniqueHistory = [];
                const seenIds = new Set();
                for (const s of combinedPool.reverse()) {
                    if (!seenIds.has(s.id)) {
                        seenIds.add(s.id);
                        uniqueHistory.push(s);
                    }
                }
                
                const shuffledSeeds = [...uniqueHistory].sort(() => 0.5 - Math.random());
                const seeds = shuffledSeeds.slice(0, 3);
                
                const primarySeed = seeds[0];
                if (primarySeed && primarySeed.id) {
                    const response = await fetch(`${BACKEND_URL}/related?video_id=${primarySeed.id}`);
                    const data = await response.json();
                    
                    container.innerHTML = '';
                    if (data.results && data.results.length > 0) {
                        data.results.slice(0, 6).forEach((song, index) => {
                            const card = createMusicCard(song, index, data.results);
                            container.appendChild(card);
                        });
                    } else {
                        document.getElementById('made-for-you-section').style.display = 'none';
                    }
                }
                
                if (dynamicContainer) {
                    for (let i = 1; i < seeds.length; i++) {
                        const seed = seeds[i];
                        if (seed && seed.id) {
                            const section = document.createElement('section');
                            section.className = 'shelf-section';
                            section.innerHTML = `
                                <div class="shelf-header">
                                    <h2>More like ${seed.title}</h2>
                                    <span class="show-all">Because you liked it</span>
                                </div>
                                <div class="cards-container" id="dynamic-shelf-${i}">
                                    <div class="loading-spinner" style="padding: 20px;">Loading...</div>
                                </div>
                            `;
                            dynamicContainer.appendChild(section);
                            
                            const res = await fetch(`${BACKEND_URL}/related?video_id=${seed.id}`);
                            const d = await res.json();
                            
                            const shelfContainer = document.getElementById(`dynamic-shelf-${i}`);
                            shelfContainer.innerHTML = '';
                            if (d.results && d.results.length > 0) {
                                d.results.slice(0, 6).forEach((song, index) => {
                                    const card = createMusicCard(song, index, d.results);
                                    shelfContainer.appendChild(card);
                                });
                            } else {
                                section.style.display = 'none';
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load made for you", e);
                document.getElementById('made-for-you-section').style.display = 'none';
            }
        } else {
            document.getElementById('made-for-you-section').style.display = 'none';
            if (dynamicContainer) {
                const defaultQueries = [
                    { title: "Bollywood Top Hits", query: "Bollywood Top 50" },
                    { title: "Workout Mix", query: "Workout Gym Music" },
                    { title: "Pop Anthems", query: "Pop Music Hits 2024" },
                    { title: "Chill & Relax", query: "Lofi Hip Hop Chill" }
                ];
                
                for (let i = 0; i < defaultQueries.length; i++) {
                    const dq = defaultQueries[i];
                    const section = document.createElement('section');
                    section.className = 'shelf-section';
                    section.innerHTML = `
                        <div class="shelf-header">
                            <h2>${dq.title}</h2>
                        </div>
                        <div class="cards-container" id="default-shelf-${i}">
                            <div class="loading-spinner" style="padding: 20px;">Loading...</div>
                        </div>
                    `;
                    dynamicContainer.appendChild(section);
                    
                    try {
                        const res = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(dq.query)}`);
                        const d = await res.json();
                        
                        const shelfContainer = document.getElementById(`default-shelf-${i}`);
                        shelfContainer.innerHTML = '';
                        if (d.results && d.results.length > 0) {
                            d.results.slice(0, 6).forEach((song, index) => {
                                const card = createMusicCard(song, index, d.results);
                                shelfContainer.appendChild(card);
                            });
                        } else {
                            section.style.display = 'none';
                        }
                    } catch (e) {
                        console.error("Failed to load default shelf", e);
                        section.style.display = 'none';
                    }
                }
            }
        }
    }

    // Listen for history updates
    window.addEventListener('listeningHistoryUpdated', () => {
        if (document.getElementById('made-for-you-section').style.display === 'none') {
            loadMadeForYou();
        }
    });
    
    async function fetchUsersFromBackend() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/users`);
            const data = await response.json();
            if (data && data.users) {
                // Merge backend users with local users (backend wins)
                data.users.forEach(backendUser => {
                    const localIndex = usersDB.findIndex(u => u.email === backendUser.email);
                    if (localIndex > -1) {
                        usersDB[localIndex].status = backendUser.status;
                        usersDB[localIndex].password = backendUser.password;
                    } else {
                        // Include likedSongs = [] for new users from backend
                        usersDB.push({...backendUser, likedSongs: []});
                    }
                });
                localStorage.setItem('usersDB', JSON.stringify(usersDB));
                
                // Update current user if logged in
                if (currentUser) {
                    const updatedMe = usersDB.find(u => u.email === currentUser.email);
                    if (updatedMe) {
                        currentUser.status = updatedMe.status;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch users from backend:", err);
        }
    }
    
    function updateGreeting() {
        const hour = new Date().getHours();
        let timeString = 'Good evening';
        if (hour < 12) timeString = 'Good morning';
        else if (hour < 18) timeString = 'Good afternoon';
        
        document.getElementById('greeting').textContent = currentUser ? `${timeString}, ${currentUser.username}` : timeString;
    }
    
    function initUI() {
        checkAuthState();
        
        // Check for updates for returning users
        const heroPlayBtn = document.querySelector('.hero-play-btn');
        const heroAddBtn = document.querySelector('.hero-add-btn');
        if (heroPlayBtn) {
            heroPlayBtn.addEventListener('click', () => {
                if (songs.length > 0) {
                    const firstSong = songs[0];
                    if (!firstSong.src) firstSong.src = `${BACKEND_URL}/stream/${firstSong.id}`;
                    audioPlayer.queue = [...songs];
                    audioPlayer.playSong(firstSong, 0);
                    audioPlayer.bufferUpcomingSongs();
                }
            });
        }
        if (heroAddBtn) {
            heroAddBtn.addEventListener('click', () => {
                if (songs.length > 0) {
                    const firstSong = songs[0];
                    if (!likedSongs.find(s => s.id === firstSong.id)) {
                        likedSongs.push(firstSong);
                        saveLikedSongs();
                        heroAddBtn.innerHTML = '<i class="fas fa-check"></i> Added';
                        heroAddBtn.style.background = 'var(--text-base)';
                        heroAddBtn.style.color = 'black';
                    }
                }
            });
        }
        
        // Check for updates for returning users
        const app_version = 'v1.1.0';
        if (localStorage.getItem('app_version') !== app_version && currentUser) {
            const updateModal = document.getElementById('update-modal');
            if (updateModal) {
                updateModal.style.display = 'flex';
                document.getElementById('close-update-btn').onclick = () => {
                    localStorage.setItem('app_version', app_version);
                    updateModal.style.display = 'none';
                };
            }
        }
        
        // Listen to song changes from player
        audioPlayer.onSongChange(async (song) => {
            currentActiveSong = song;
            updateLikeButtonsState();
            visualizer.init(); // Init audio context on first play
            
            // Fetch lyrics from LRCLIB
            lyricsSync.loadLyrics([]); // Clear old lyrics
            try {
                const lyricsEl = document.getElementById('lyrics-content');
                if (lyricsEl) lyricsEl.innerHTML = '<p class="active-lyric">Searching for lyrics...</p>';
                
                const response = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(song.artist)}&track_name=${encodeURIComponent(song.title)}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.syncedLyrics) {
                        const parsedLyrics = parseLRC(data.syncedLyrics);
                        lyricsSync.loadLyrics(parsedLyrics);
                        song.lyrics = parsedLyrics; // cache it
                    } else if (data && data.plainLyrics) {
                        // fallback to plain lyrics (lyrics.js will auto-scroll it)
                        lyricsSync.loadLyrics(data.plainLyrics);
                        song.lyrics = data.plainLyrics;
                    } else {
                        lyricsSync.loadLyrics([]);
                    }
                } else {
                    lyricsSync.loadLyrics([]);
                }
            } catch (err) {
                console.error("Lyrics fetch error:", err);
                lyricsSync.loadLyrics([]);
            }

            // Check if downloaded to update icon color
            const downloadBtn = document.getElementById('download-btn');
            if (downloadBtn) {
                const isSaved = await musicDB.getDownload(song.id);
                if (isSaved) {
                    downloadBtn.style.color = 'var(--accent-color)';
                } else {
                    downloadBtn.style.color = 'var(--text-subdued)';
                }
            }
            
            // Add to Play History for Recommendations
            if (currentUser) {
                if (!currentUser.playHistory) currentUser.playHistory = [];
                // Only add if it's not the same as the last played to prevent spam
                if (currentUser.playHistory.length === 0 || currentUser.playHistory[currentUser.playHistory.length - 1].id !== song.id) {
                    currentUser.playHistory.push(song);
                    // Keep history capped at 50 to save space
                    if (currentUser.playHistory.length > 50) currentUser.playHistory.shift();
                    
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Update in Users DB array
                    const dbIndex = usersDB.findIndex(u => u.id === currentUser.id);
                    if(dbIndex > -1) {
                        usersDB[dbIndex] = currentUser;
                        localStorage.setItem('usersDB', JSON.stringify(usersDB));
                    }
                }
            }
        });
        
        // Drawer toggles
        visualizerBtn.addEventListener('click', () => openDrawer('viz'));
        lyricsBtn.addEventListener('click', () => openDrawer('lyrics'));
        queueBtn.addEventListener('click', () => openDrawer('queue'));
        closeDrawerBtn.addEventListener('click', () => app.classList.remove('drawer-open'));
        
        // On mobile, tap the mini-player to open the visualizer/now playing drawer
        const nowPlayingInfo = document.querySelector('.now-playing-info');
        if (nowPlayingInfo) {
            nowPlayingInfo.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && !e.target.closest('.like-btn')) {
                    openDrawer('viz');
                }
            });
        }
        
        // Download Button
        const downloadBtn = document.getElementById('download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async () => {
                if (currentActiveSong && currentActiveSong.id) {
                    // Check if already downloaded
                    const existing = await musicDB.getDownload(currentActiveSong.id);
                    if (existing) {
                        // Ask to remove
                        if (confirm("This song is already downloaded. Remove from downloads?")) {
                            await musicDB.deleteDownload(currentActiveSong.id);
                            downloadBtn.style.color = 'var(--text-subdued)';
                            if (document.getElementById('downloads-view').classList.contains('active-view')) {
                                renderDownloads();
                            }
                        }
                        return;
                    }
                    
                    const downloadApiUrl = `${BACKEND_URL}/download/${currentActiveSong.id}`;
                    
                    // Show loading state
                    const originalIcon = downloadBtn.innerHTML;
                    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    try {
                        const response = await fetch(downloadApiUrl);
                        const data = await response.json();
                        if (!data.url) throw new Error("No download URL returned");
                        
                        // Trigger native browser download/open since CORS prevents saving to IndexedDB
                        window.open(data.url, '_blank');
                        
                        downloadBtn.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => downloadBtn.innerHTML = originalIcon, 2000);
                    } catch (e) {
                        console.error("Download error:", e);
                        alert("Failed to fetch download link.");
                        downloadBtn.innerHTML = originalIcon;
                    }
                }
            });
        }
        
        // Create Playlist
        const createPlaylistBtn = document.getElementById('create-playlist');
        if (createPlaylistBtn) {
            createPlaylistBtn.addEventListener('click', () => {
                const name = prompt("Enter a name for your new playlist:");
                if (name && name.trim()) {
                    playlists.push(name.trim());
                    updatePlaylists();
                }
            });
        }
        
        // Navigation
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                navLinks.forEach(l => l.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                
                const viewId = target.getAttribute('data-view');
                switchView(viewId);
                
                if (viewId === 'users-admin') {
                    renderUsersTable();
                }
                
                // Handle Artists sidebar button
                if (target.id === 'sidebar-artists-btn') {
                    document.querySelectorAll('.lib-tab').forEach(t => t.classList.remove('active'));
                    const artistsTab = document.querySelector('.lib-tab[data-tab="artists"]');
                    if (artistsTab) artistsTab.classList.add('active');
                    
                    const songsContainer = document.querySelector('#library-view .songs-list-container');
                    const artistsContainer = document.getElementById('artists-tab-content');
                    if (songsContainer) songsContainer.style.display = 'none';
                    if (artistsContainer) artistsContainer.style.display = 'block';
                }
            });
        });
        
        // Library Tabs Logic
        const libTabs = document.querySelectorAll('.lib-tab');
        libTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                libTabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const tabId = e.currentTarget.getAttribute('data-tab');
                const songsContainer = document.querySelector('#library-view .songs-list-container');
                const artistsContainer = document.getElementById('artists-tab-content');
                
                if (tabId === 'songs') {
                    if (songsContainer) songsContainer.style.display = 'block';
                    if (artistsContainer) artistsContainer.style.display = 'none';
                } else if (tabId === 'artists') {
                    if (songsContainer) songsContainer.style.display = 'none';
                    if (artistsContainer) artistsContainer.style.display = 'block';
                } else if (tabId === 'downloads') {
                    switchView('downloads');
                    navLinks.forEach(l => l.classList.remove('active'));
                    const dlLink = document.querySelector('.nav-links li[data-view="downloads"]');
                    if (dlLink) dlLink.classList.add('active');
                }
            });
        });
        
        // Live Search Logic
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchTimeout);
            
            if (!query) {
                searchResultsContainer.style.display = 'none';
                document.getElementById('search-history-container').style.display = 'block';
                return;
            }
            
            document.getElementById('search-history-container').style.display = 'none';
            searchResultsContainer.style.display = 'block';
            searchResultsList.innerHTML = '<p>Searching live catalog...</p>';
            
            searchTimeout = setTimeout(() => handleLiveSearch(query), 500);
        });
        
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    saveSearchHistory(query);
                }
            }
        });
        
        // Like buttons
        playerLikeBtn.addEventListener('click', toggleLike);
        drawerLikeBtn.addEventListener('click', toggleLike);
        
        document.getElementById('liked-songs').addEventListener('click', () => {
            switchView('library');
        });
        
        // Upload logic
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileUpload);
        
        // Auth Logic
        logoutBtn.addEventListener('click', handleLogout);
        
        authToggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            if (isLoginMode) {
                authTitle.textContent = "Log in to Music+";
                authSubmitBtn.textContent = "Log In";
                authToggleText.textContent = "Don't have an account?";
                authToggleLink.textContent = "Sign up";
                usernameGroup.style.display = 'none';
                usernameInput.required = false;
            } else {
                authTitle.textContent = "Sign up for Music+";
                authSubmitBtn.textContent = "Sign Up";
                authToggleText.textContent = "Already have an account?";
                authToggleLink.textContent = "Log in";
                usernameGroup.style.display = 'block';
                usernameInput.required = true;
            }
            authError.style.display = 'none';
        });
        
        authForm.addEventListener('submit', handleAuthSubmit);
        
        // Settings Modal Logic
        const settingsModal = document.getElementById('user-settings-modal');
        userAvatar.addEventListener('click', () => {
            if (currentUser) {
                document.getElementById('settings-username').value = currentUser.username;
                document.getElementById('settings-password').value = '';
                document.getElementById('settings-message').style.display = 'none';
                settingsModal.style.display = 'flex';
            }
        });
        
        document.getElementById('close-settings').addEventListener('click', () => {
            settingsModal.style.display = 'none';
        });
        
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const newUsername = document.getElementById('settings-username').value.trim();
            const oldPassword = document.getElementById('settings-old-password').value;
            const newPassword = document.getElementById('settings-password').value;
            const messageEl = document.getElementById('settings-message');
            
            // Password verification if they want to change password
            if (newPassword) {
                if (oldPassword !== currentUser.password) {
                    messageEl.textContent = 'Incorrect old password!';
                    messageEl.style.color = 'var(--error)';
                    messageEl.style.display = 'block';
                    return;
                }
            }
            
            if (newUsername) {
                currentUser.username = newUsername;
                if (newPassword) currentUser.password = newPassword;
                
                // Update in DB
                const dbIndex = usersDB.findIndex(u => u.id === currentUser.id);
                if (dbIndex > -1) {
                    usersDB[dbIndex] = currentUser;
                    localStorage.setItem('usersDB', JSON.stringify(usersDB));
                }
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                messageEl.textContent = 'Profile updated successfully!';
                messageEl.style.color = '#1DB954';
                messageEl.style.display = 'block';
                updateGreeting();
                userAvatar.setAttribute('title', currentUser.username);
                
                setTimeout(() => { settingsModal.style.display = 'none'; }, 1500);
            }
        });
    }
    
    // AUTHENTICATION LOGIC
    function checkAuthState() {
        if (!currentUser) {
            // Forced Login State
            authModal.style.display = 'flex';
            document.getElementById('main-content').style.display = 'none';
            document.querySelector('.sidebar').style.display = 'none';
            document.querySelector('.player-dock').style.display = 'none';
            loginBtn.style.display = 'block';
            userAvatar.style.display = 'none';
            logoutBtn.style.display = 'none';
            adminNav.style.display = 'none';
            uiInitialized = false;
        } else {
            // Logged In State
            authModal.style.display = 'none';
            document.getElementById('main-content').style.display = 'flex';
            const sb = document.querySelector('.sidebar');
            if (sb) sb.style.display = 'flex';
            const pd = document.querySelector('.player-dock');
            if (pd) pd.style.display = 'flex';
            loginBtn.style.display = 'none';
            userAvatar.style.display = 'flex';
            
            renderAppWhenReady();
            
            // Set Avatar to First Letter
            userAvatar.innerHTML = currentUser.username.charAt(0).toUpperCase();
            userAvatar.style.background = 'var(--accent-color)';
            userAvatar.style.color = 'white';
            userAvatar.style.justifyContent = 'center';
            userAvatar.style.alignItems = 'center';
            userAvatar.style.fontWeight = 'bold';
            userAvatar.style.fontSize = '18px';
            
            logoutBtn.style.display = 'block';
            userAvatar.setAttribute('title', currentUser.username);
            updateGreeting();
            
            if (currentUser.email === 'admin@musicplus.com') {
                adminNav.style.display = 'flex';
            } else {
                adminNav.style.display = 'none';
            }
        }
    }
    
    async function handleAuthSubmit(e) {
        e.preventDefault();
        const email = emailInput.value;
        const user = usernameInput.value;
        const password = document.getElementById('auth-password').value;
        
        try {
            if (isLoginMode) {
                // LOGIN MODE: Fetch fresh data first to check approvals instantly
                await fetchUsersFromBackend();
                
                // Only check Email and Password
                const foundUser = usersDB.find(u => u.email === email);
                if (foundUser) {
                    if (foundUser.status === 'pending') {
                        authError.style.color = 'var(--error)';
                        authError.textContent = "Your account is pending Admin approval. Please check back later.";
                        authError.style.display = 'block';
                        return;
                    }
                    if (foundUser.password !== password) {
                        authError.style.color = 'var(--error)';
                        authError.textContent = "Incorrect password.";
                        authError.style.display = 'block';
                        return;
                    }
                    
                    // Success!
                    currentUser = foundUser;
                    likedSongs = currentUser.likedSongs || [];
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Sync to backend DB
                    syncUserToBackend(currentUser);
                    
                    authForm.reset();
                    authError.style.display = 'none';
                    checkAuthState();
                } else {
                    authError.style.color = 'var(--error)';
                    authError.textContent = "Email not registered. Please sign up.";
                    authError.style.display = 'block';
                }
            } else {
                // SIGNUP MODE: Create user as pending
                if (usersDB.find(u => u.email === email)) {
                    authError.style.color = 'var(--error)';
                    authError.textContent = "Email already registered. Please log in.";
                    authError.style.display = 'block';
                    return;
                }
                
                const newUser = {
                    id: 'usr_' + Date.now(),
                    email: email,
                    username: user,
                    password: password,
                    status: 'pending', // Requires admin approval
                    likedSongs: []
                };
                usersDB.push(newUser);
                localStorage.setItem('usersDB', JSON.stringify(usersDB));
                
                // Also create in backend DB with pending status
                syncUserToBackend(newUser);
                
                authForm.reset();
                authError.style.color = '#1DB954';
                authError.textContent = "Account created! Please wait for the Admin to approve your account before logging in.";
                authError.style.display = 'block';
                
                // Switch back to login view but leave the success message visible
                isLoginMode = true;
                authTitle.textContent = "Log in to Music+";
                authSubmitBtn.textContent = "Log In";
                authToggleText.textContent = "Don't have an account?";
                authToggleLink.textContent = "Sign up";
                usernameGroup.style.display = 'none';
                usernameInput.required = false;
            }
        } catch (err) {
            authError.style.color = 'var(--error)';
            authError.textContent = err.message || "Authentication failed.";
            authError.style.display = 'block';
        }
    }

    async function syncUserToBackend(user) {
        try {
            await fetch(`${BACKEND_URL}/api/sync-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: user.email,
                    username: user.username,
                    password: user.password,
                    status: user.status
                })
            });
        } catch (err) {
            console.error("Failed to sync user to backend:", err);
        }
    }
    
    function handleLogout() {
        currentUser = null;
        likedSongs = [];
        localStorage.removeItem('currentUser');
        localStorage.removeItem('musicplus_session'); // Clear queue and current song for next user
        checkAuthState();
        switchView('home');
        // Reset active nav
        navLinks.forEach(l => l.classList.remove('active'));
        navLinks[0].classList.add('active');
        audioPlayer.audio.pause();
    }
    
    function renderUsersTable() {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        usersDB.forEach(u => {
            const tr = document.createElement('tr');
            
            let actionBtn = '';
            let statusColor = u.status === 'approved' ? 'var(--accent-color)' : '#f39c12';
            
            let deleteBtn = '';
            if (u.email !== 'admin@musicplus.com') {
                deleteBtn = `<button class="delete-btn" data-id="${u.id}" style="background: #e91429; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-left: 8px;">Delete</button>`;
            }
            
            if (u.status === 'pending') {
                actionBtn = `<button class="approve-btn" data-id="${u.id}" style="background: var(--accent-color); color: black; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Approve</button>`;
            }
            
            tr.innerHTML = `
                <td>${u.id}</td>
                <td style="font-weight: 600;">${u.username}</td>
                <td>${u.email}</td>
                <td style="color: ${statusColor}; text-transform: capitalize;">${u.status}</td>
                <td>${actionBtn}${deleteBtn}</td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add listeners to approve buttons
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-id');
                const userIndex = usersDB.findIndex(u => u.id === userId);
                if (userIndex > -1) {
                    usersDB[userIndex].status = 'approved';
                    localStorage.setItem('usersDB', JSON.stringify(usersDB));
                    syncUserToBackend(usersDB[userIndex]);
                    renderUsersTable();
                }
            });
        });
        
        // Add listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-id');
                if(confirm("Are you sure you want to delete this user?")) {
                    usersDB = usersDB.filter(u => u.id !== userId);
                    localStorage.setItem('usersDB', JSON.stringify(usersDB));
                    renderUsersTable();
                }
            });
        });
    }
    
    // UI POPULATION LOGIC
// UI POPULATION LOGIC
    function populateHome() {
        const quickGrid = document.getElementById('quick-play-grid');
        const madeForYou = document.getElementById('made-for-you');
        const recentlyPlayed = document.getElementById('recently-played');
        
        if (quickGrid) quickGrid.innerHTML = '';
        if (madeForYou) madeForYou.innerHTML = '';
        if (recentlyPlayed) recentlyPlayed.innerHTML = '';
        
        // Quick Play (first 6 songs)
        songs.slice(0, 6).forEach((song, i) => {
            const card = document.createElement('div');
            card.className = 'quick-card';
            card.innerHTML = `
                <img src="${song.cover}" alt="cover" loading="lazy">
                <h4>${song.title}</h4>
                <button class="quick-play-btn"><i class="fas fa-play"></i></button>
            `;
            card.addEventListener('click', () => { 
                if (!song.src) song.src = `${BACKEND_URL}/stream/${song.id}`;
                audioPlayer.queue = [song]; 
                audioPlayer.playSong(song, 0); 
                audioPlayer.bufferUpcomingSongs(); 
            });
            if (quickGrid) quickGrid.appendChild(card);
        });
        
        // Trending Now (Ranked List in #made-for-you container)
        songs.slice(6, 12).forEach((song, i) => {
            const row = document.createElement('div');
            row.className = 'trending-row';
            
            // Format duration if available, else omit
            const duration = song.duration ? `<p>${song.duration}</p>` : '';
            
            row.innerHTML = `
                <div class="rank">${(i + 1).toString().padStart(2, '0')}</div>
                <img src="${song.cover}" alt="cover" loading="lazy">
                <div class="trending-row-info">
                    <h4>${song.title}</h4>
                    <p>${song.artist}</p>
                </div>
                ${duration}
                <div class="trending-row-actions">
                    <button class="trend-like-btn" title="Like"><i class="far fa-heart"></i></button>
                    <button title="More"><i class="fas fa-ellipsis-h"></i></button>
                </div>
            `;
            
            row.addEventListener('click', (e) => {
                if(e.target.closest('button')) return; // Ignore button clicks
                if (!song.src) song.src = `${BACKEND_URL}/stream/${song.id}`;
                audioPlayer.queue = [song]; 
                audioPlayer.playSong(song, 0); 
                audioPlayer.bufferUpcomingSongs(); 
            });
            
            const likeBtn = row.querySelector('.trend-like-btn');
            likeBtn.addEventListener('click', () => {
                const idx = likedSongs.findIndex(s => s.id === song.id);
                if (idx > -1) {
                    likedSongs.splice(idx, 1);
                    likeBtn.innerHTML = '<i class="far fa-heart"></i>';
                } else {
                    likedSongs.push(song);
                    likeBtn.innerHTML = '<i class="fas fa-heart"></i>';
                }
                saveLikedSongs();
                updateLikeButtonState();
            });
            
            if (madeForYou) madeForYou.appendChild(row);
        });
        
        // Recently Played
        if (currentUser && currentUser.playHistory && currentUser.playHistory.length > 0) {
            // Show last 6 played songs (reversed so most recent is first)
            const recent = [...currentUser.playHistory].reverse().slice(0, 6);
            recent.forEach((song, i) => {
                const card = createMusicCard(song, i, recent);
                recentlyPlayed.appendChild(card);
            });
        } else {
            // Fallback to random songs if no history
            songs.slice(12, 18).forEach((song, i) => {
                const card = createMusicCard(song, i + 12, songs);
                recentlyPlayed.appendChild(card);
            });
        }
    }
    
    function createMusicCard(song, index, queueArray) {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
            <div class="card-img-container">
                <img src="${song.cover}" alt="cover" loading="lazy">
                <button class="card-play-btn"><i class="fas fa-play"></i></button>
            </div>
            <h4>${song.title}</h4>
            <p>${song.artist}</p>
        `;
        card.addEventListener('click', () => { 
            if (!song.src) song.src = `${BACKEND_URL}/stream/${song.id}`;
            audioPlayer.queue = [song]; 
            audioPlayer.playSong(song, 0); 
            audioPlayer.bufferUpcomingSongs(); 
        });
        return card;
    }
    
    function populateGenres() {
        const grid = document.getElementById('genre-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        // Let's add some popular search terms since genres are limited
        const searchTerms = ["Electronic", "Hip-Hop", "Pop", "Lo-Fi", "Rock", "Bollywood", "Punjabi", "Workout", "Chill", "Romantic", "Party", "Acoustic"];
        
        searchTerms.forEach(term => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.style.backgroundColor = `hsl(${Math.random() * 360}, 70%, 25%)`;
            card.style.height = '120px';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'center';
            card.style.overflow = 'hidden';
            
            card.innerHTML = `<h3 style="font-size: 20px; font-weight: 700; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${term}</h3>`;
            
            card.addEventListener('click', () => {
                const searchInput = document.getElementById('search-input');
                searchInput.value = term;
                searchInput.dispatchEvent(new Event('input'));
                
                // Trigger the enter keydown event to save it to history
                searchInput.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
            });
            
            grid.appendChild(card);
        });
    }
    
    function openDrawer(type) {
        app.classList.add('drawer-open');
        
        // Hide all
        lyricsDrawer.style.display = 'none';
        queueDrawer.style.display = 'none';
        nowPlayingDrawer.style.display = 'none';
        
        visualizerBtn.classList.remove('active');
        lyricsBtn.classList.remove('active');
        queueBtn.classList.remove('active');
        
        if (type === 'viz') {
            nowPlayingDrawer.style.display = 'block';
            vizDrawer.style.display = 'block';
            drawerTitle.textContent = 'Now Playing';
            visualizerBtn.classList.add('active');
            visualizer.init(); 
        } else if (type === 'lyrics') {
            nowPlayingDrawer.style.display = 'block';
            vizDrawer.style.display = 'none';
            lyricsDrawer.style.display = 'block';
            drawerTitle.textContent = 'Lyrics';
            lyricsBtn.classList.add('active');
        } else if (type === 'queue') {
            queueDrawer.style.display = 'block';
            drawerTitle.textContent = 'Queue';
            queueBtn.classList.add('active');
            renderQueue();
        }
    }
    
    function renderQueue() {
        const qList = document.getElementById('queue-list');
        qList.innerHTML = '';
        
        let draggedIndex = null;
        
        audioPlayer.queue.forEach((song, i) => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.draggable = true;
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            item.style.padding = '8px';
            item.style.borderRadius = '4px';
            
            const isPlaying = (i === audioPlayer.currentSongIndex);
            if (isPlaying) item.style.color = 'var(--accent-color)';
            
            item.innerHTML = `
                <i class="fas fa-grip-vertical queue-item-drag-handle"></i>
                <img src="${song.cover}" loading="lazy" style="width: 40px; height: 40px; border-radius: 4px; pointer-events: none; flex-shrink: 0;">
                <div style="flex-grow: 1; pointer-events: none; overflow: hidden; min-width: 0;">
                    <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.title}</div>
                    <div style="font-size: 12px; color: var(--text-subdued); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.artist}</div>
                </div>
            `;
            
            // Delete button (don't allow deleting the currently playing song to avoid logic bugs)
            if (!isPlaying) {
                const delBtn = document.createElement('button');
                delBtn.innerHTML = '<i class="fas fa-times"></i>';
                delBtn.style.background = 'none';
                delBtn.style.border = 'none';
                delBtn.style.color = 'var(--text-subdued)';
                delBtn.style.cursor = 'pointer';
                delBtn.style.padding = '4px';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    audioPlayer.queue.splice(i, 1);
                    if (audioPlayer.currentSongIndex > i) {
                        audioPlayer.currentSongIndex--;
                    }
                    
                    // Buffer if we dropped below 10
                    if (audioPlayer.queue.length - audioPlayer.currentSongIndex <= 10) {
                        audioPlayer.bufferUpcomingSongs();
                    }
                    
                    audioPlayer.saveSession();
                    renderQueue();
                };
                item.appendChild(delBtn);
            }
            
            // Drag Events
            item.addEventListener('dragstart', (e) => {
                draggedIndex = i;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                item.classList.add('drag-over');
            });
            
            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });
            
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                if (draggedIndex === null || draggedIndex === i) return;
                
                // Reorder array
                const draggedSong = audioPlayer.queue.splice(draggedIndex, 1)[0];
                audioPlayer.queue.splice(i, 0, draggedSong);
                
                // Update currentSongIndex if it was affected
                if (audioPlayer.currentSongIndex === draggedIndex) {
                    audioPlayer.currentSongIndex = i;
                } else if (draggedIndex < audioPlayer.currentSongIndex && i >= audioPlayer.currentSongIndex) {
                    audioPlayer.currentSongIndex--;
                } else if (draggedIndex > audioPlayer.currentSongIndex && i <= audioPlayer.currentSongIndex) {
                    audioPlayer.currentSongIndex++;
                }
                
                audioPlayer.saveSession();
                renderQueue();
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                draggedIndex = null;
            });
            
            // Play song on double click or when clicking the text area
            item.addEventListener('dblclick', () => audioPlayer.playSong(song, i));
            
            qList.appendChild(item);
        });
    }
    
    function switchView(viewId) {
        views.forEach(v => v.classList.remove('active-view'));
        
        if (viewId === 'search') {
            document.getElementById('search-view').classList.add('active-view');
            searchContainer.style.display = 'block';
            searchInput.focus();
        } else {
            searchContainer.style.display = 'none';
            if (viewId === 'home') {
                document.getElementById('home-view').classList.add('active-view');
            } else if (viewId === 'library') {
                document.getElementById('library-view').classList.add('active-view');
                renderLikedSongs();
            } else if (viewId === 'downloads') {
                document.getElementById('downloads-view').classList.add('active-view');
                renderDownloads();
            } else if (viewId === 'users-admin') {
                document.getElementById('users-admin-view').classList.add('active-view');
            } else if (viewId === 'artist') {
                document.getElementById('artist-view').classList.add('active-view');
            }
        }
    }
    
    async function handleLiveSearch(query) {
        currentSearchResults = await searchAudiusTracks(query);
        
        searchResultsList.innerHTML = '';
        if (currentSearchResults.length === 0) {
            searchResultsList.innerHTML = '<p>No results found</p>';
            return;
        }
        
        currentSearchResults.forEach((song, idx) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '16px';
            item.style.padding = '8px';
            item.style.borderRadius = '4px';
            item.style.cursor = 'pointer';
            item.onmouseover = () => item.style.backgroundColor = 'var(--bg-color-elevated)';
            item.onmouseout = () => item.style.backgroundColor = 'transparent';
            
            item.innerHTML = `
                <img src="${song.cover}" loading="lazy" style="width: 48px; height: 48px; border-radius: 4px;">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600;">${song.title}</div>
                    <div style="font-size: 14px; color: var(--text-subdued);">${song.artist}</div>
                </div>
            `;
            item.addEventListener('click', () => {
                if (!song.src) song.src = `${BACKEND_URL}/stream/${song.id}`;
                // Play clicked song, and start a fresh queue based on its vibe
                audioPlayer.queue = [song];
                audioPlayer.playSong(song, 0);
                audioPlayer.saveSession();
                audioPlayer.bufferUpcomingSongs();
            });
            searchResultsList.appendChild(item);
        });
    }
    
    function toggleLike() {
        if (!currentActiveSong) return;
        
        const index = likedSongs.findIndex(s => s.id === currentActiveSong.id);
        if (index > -1) {
            likedSongs.splice(index, 1);
        } else {
            likedSongs.push(currentActiveSong);
        }
        
        // Save to current user
        currentUser.likedSongs = likedSongs;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Save back to Users DB array
        const dbIndex = usersDB.findIndex(u => u.id === currentUser.id);
        if(dbIndex > -1) {
            usersDB[dbIndex] = currentUser;
            localStorage.setItem('usersDB', JSON.stringify(usersDB));
        }
        
        updateLikeButtonsState();
        
        // Refresh library view if active
        if (document.getElementById('library-view').classList.contains('active-view')) {
            renderLikedSongs();
        }
    }
    
    function updateLikeButtonsState() {
        if (!currentActiveSong || !currentUser) {
            playerLikeBtn.classList.remove('liked');
            playerLikeBtn.innerHTML = '<i class="far fa-heart"></i>';
            drawerLikeBtn.classList.remove('liked');
            drawerLikeBtn.innerHTML = '<i class="far fa-heart"></i>';
            return;
        }
        
        const isLiked = likedSongs.some(s => s.id === currentActiveSong.id);
        
        if (isLiked) {
            playerLikeBtn.classList.add('liked');
            playerLikeBtn.innerHTML = '<i class="fas fa-heart"></i>';
            drawerLikeBtn.classList.add('liked');
            drawerLikeBtn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            playerLikeBtn.classList.remove('liked');
            playerLikeBtn.innerHTML = '<i class="far fa-heart"></i>';
            drawerLikeBtn.classList.remove('liked');
            drawerLikeBtn.innerHTML = '<i class="far fa-heart"></i>';
        }
    }
    
    function renderLikedSongs() {
        const list = document.getElementById('liked-songs-list');
        list.innerHTML = '';
        
        if (likedSongs.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <h3>YOUR LIBRARY IS QUIET</h3>
                    <p>Start discovering music worth keeping.</p>
                    <button class="cta-btn" onclick="document.querySelector('[data-view=\\'home\\']').click()">EXPLORE MUSIC</button>
                </div>
            `;
            return;
        }
        
        likedSongs.forEach((song, i) => {
            const item = document.createElement('div');
            item.style.display = 'grid';
            item.style.gridTemplateColumns = '40px 1fr 1fr 60px 40px';
            item.style.alignItems = 'center';
            item.style.padding = '8px 16px';
            item.style.borderRadius = '4px';
            item.style.cursor = 'pointer';
            item.style.marginBottom = '4px';
            item.onmouseover = () => item.style.backgroundColor = 'var(--bg-color-elevated)';
            item.onmouseout = () => item.style.backgroundColor = 'transparent';
            
            item.innerHTML = `
                <div>${i + 1}</div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${song.cover}" loading="lazy" style="width: 40px; height: 40px; border-radius: 4px;">
                    <div>
                        <div style="font-weight: 600; color: white;">${song.title}</div>
                        <div style="font-size: 14px; color: var(--text-subdued);">${song.artist}</div>
                    </div>
                </div>
                <div style="color: var(--text-subdued); font-size: 14px;">${song.album}</div>
                <div style="color: var(--text-subdued); font-size: 14px;">${song.duration}</div>
            `;
            
            // Unlike Button
            const unlikeBtn = document.createElement('button');
            unlikeBtn.innerHTML = '<i class="fas fa-heart"></i>';
            unlikeBtn.style.color = 'var(--accent-color)';
            unlikeBtn.style.background = 'none';
            unlikeBtn.style.border = 'none';
            unlikeBtn.style.cursor = 'pointer';
            unlikeBtn.onclick = (e) => {
                e.stopPropagation();
                likedSongs.splice(i, 1);
                
                currentUser.likedSongs = likedSongs;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                const dbIndex = usersDB.findIndex(u => u.id === currentUser.id);
                if(dbIndex > -1) {
                    usersDB[dbIndex] = currentUser;
                    localStorage.setItem('usersDB', JSON.stringify(usersDB));
                }
                
                updateLikeButtonsState();
                renderLikedSongs();
            };
            item.appendChild(unlikeBtn);
            
            item.addEventListener('click', () => {
                audioPlayer.queue = likedSongs;
                audioPlayer.playSong(song, i);
            });
            list.appendChild(item);
        });
    }
    
    function updatePlaylists() {
        const ul = document.getElementById('user-playlists');
        ul.innerHTML = '';
        playlists.forEach(p => {
            const li = document.createElement('li');
            li.textContent = p;
            ul.appendChild(li);
        });
    }
    
    function handleFileUpload(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        Array.from(files).forEach((file, index) => {
            const objectUrl = URL.createObjectURL(file);
            const customSong = {
                id: 'custom-' + Date.now() + index,
                title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                artist: 'Local Artist',
                album: 'Local Uploads',
                cover: 'https://via.placeholder.com/300?text=Local+File',
                src: objectUrl,
                duration: 'Unknown',
                genre: 'Local',
                color: '#333333',
                lyrics: []
            };
            
            songs.unshift(customSong); // Add to beginning
            audioPlayer.queue = songs;
            
            // Auto play first uploaded
            if (index === 0) {
                audioPlayer.playSong(customSong, 0);
            }
        });
        
        // Refresh home if active
        if (document.getElementById('home-view').classList.contains('active-view')) {
            populateHome();
        }
    }
    
    // Fullscreen toggle logic
    const fsBtn = document.getElementById('fullscreen-btn');
    const playerDock = document.querySelector('.player-dock');
    
    if (fsBtn && playerDock) {
        fsBtn.addEventListener('click', () => {
            playerDock.classList.toggle('expanded');
            
            if (playerDock.classList.contains('expanded')) {
                fsBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
                fsBtn.setAttribute('data-tooltip', 'Minimize Player');
                
                // Add a background element for the blurred artwork if it doesn't exist
                if (!document.getElementById('player-expanded-bg')) {
                    const bg = document.createElement('div');
                    bg.id = 'player-expanded-bg';
                    playerDock.prepend(bg);
                }
                
                const bgEl = document.getElementById('player-expanded-bg');
                if (currentActiveSong) {
                    bgEl.style.backgroundImage = `url(${currentActiveSong.cover})`;
                }
            } else {
                fsBtn.innerHTML = '<i class="fas fa-expand-alt"></i>';
                fsBtn.setAttribute('data-tooltip', 'Expand Player');
            }
        });
    }
    
    // SEARCH HISTORY LOGIC
    function saveSearchHistory(query) {
        // Remove if exists to move it to top
        searchHistory = searchHistory.filter(q => q.toLowerCase() !== query.toLowerCase());
        searchHistory.unshift(query);
        if (searchHistory.length > 10) searchHistory.pop();
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
        renderSearchHistory();
    }
    
    window.saveSearchHistory = saveSearchHistory; // Expose globally if needed
    
    function renderSearchHistory() {
        const historyContainer = document.getElementById('search-history-container');
        const historyList = document.getElementById('search-history-list');
        if (!historyContainer || !historyList) return;
        
        if (searchHistory.length === 0) {
            historyContainer.style.display = 'none';
            return;
        }
        
        // Show if search input is empty
        if (!document.getElementById('search-input').value.trim()) {
            historyContainer.style.display = 'block';
        }
        
        historyList.innerHTML = '';
        searchHistory.forEach((query, index) => {
            const card = document.createElement('div');
            card.className = 'music-card';
            card.style.display = 'flex';
            card.style.alignItems = 'center';
            card.style.justifyContent = 'space-between';
            card.style.padding = '12px';
            
            const leftGroup = document.createElement('div');
            leftGroup.style.display = 'flex';
            leftGroup.style.alignItems = 'center';
            leftGroup.style.cursor = 'pointer';
            leftGroup.style.flexGrow = '1';
            
            const icon = document.createElement('i');
            icon.className = 'fas fa-history';
            icon.style.marginRight = '12px';
            icon.style.color = 'var(--text-subdued)';
            icon.style.fontSize = '20px';
            
            const text = document.createElement('h4');
            text.textContent = query;
            text.style.margin = '0';
            
            leftGroup.appendChild(icon);
            leftGroup.appendChild(text);
            
            leftGroup.addEventListener('click', () => {
                const searchInput = document.getElementById('search-input');
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input'));
                saveSearchHistory(query); // bump to top
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.style.background = 'none';
            deleteBtn.style.border = 'none';
            deleteBtn.style.color = 'var(--text-subdued)';
            deleteBtn.style.fontSize = '16px';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.padding = '4px 8px';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent clicking the card
                searchHistory.splice(index, 1);
                localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
                renderSearchHistory();
            });
            
            card.appendChild(leftGroup);
            card.appendChild(deleteBtn);
            
            historyList.appendChild(card);
        });
    }
    window.renderSearchHistory = renderSearchHistory; // expose
    
    let currentArtistSongs = [];
    async function loadArtistProfile(browseId, fallbackImage) {
        // Switch to artist view
        switchView('artist');
        document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
        
        const nameEl = document.getElementById('artist-view-name');
        const descEl = document.getElementById('artist-view-description');
        const wrapperEl = document.querySelector('.artist-header-wrapper');
        const songsList = document.getElementById('artist-popular-songs');
        const playBtn = document.getElementById('artist-play-btn');
        
        nameEl.textContent = 'Loading...';
        descEl.textContent = '';
        songsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-subdued);"><i class="fas fa-spinner fa-spin"></i> Fetching artist details...</div>';
        wrapperEl.style.backgroundImage = `url('${fallbackImage || ''}')`;
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/artist/${browseId}`);
            if (!response.ok) throw new Error('Failed to fetch artist');
            const data = await response.json();
            
            nameEl.textContent = data.name || data.artist || 'Artist';
            descEl.textContent = data.description || '';
            
            if (data.thumbnails && data.thumbnails.length > 0) {
                // Get the largest thumbnail
                const bestThumb = data.thumbnails.reduce((prev, curr) => (curr.width > prev.width) ? curr : prev);
                wrapperEl.style.backgroundImage = `url('${bestThumb.url}')`;
            }
            
            songsList.innerHTML = '';
            
            // Render songs
            let tracks = [];
            if (data.songs && data.songs.results) {
                tracks = data.songs.results;
            } else if (data.singles && data.singles.results) {
                tracks = data.singles.results;
            }
            
            currentArtistSongs = [];
            
            if (tracks.length > 0) {
                tracks.forEach((track, index) => {
                    if (!track.videoId) return;
                    
                    const durationStr = track.duration || "3:00";
                    let durationSec = 180;
                    if (durationStr.includes(':')) {
                        const parts = durationStr.split(':');
                        if (parts.length === 2) durationSec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                    }
                    
                    const thumbnails = track.thumbnails || data.thumbnails || [];
                    const cover = thumbnails.length > 0 ? thumbnails[thumbnails.length-1].url : `https://i.ytimg.com/vi/${track.videoId}/hqdefault.jpg`;
                    
                    const songObj = {
                        id: track.videoId,
                        title: track.title || 'Unknown',
                        artist: nameEl.textContent,
                        cover: cover,
                        duration: durationSec,
                        genre: 'Music',
                        color: '#3d91f4',
                        lyrics: []
                    };
                    
                    currentArtistSongs.push(songObj);
                    
                    const row = document.createElement('div');
                    row.className = 'song-row';
                    row.innerHTML = `
                        <div class="song-col song-index" style="width: 32px; color: var(--text-subdued);">${index + 1}</div>
                        <div class="song-col song-info">
                            <img src="${songObj.cover}" alt="cover">
                            <div class="song-details">
                                <span class="song-title">${songObj.title}</span>
                                <span class="song-artist">${songObj.artist}</span>
                            </div>
                        </div>
                        <div class="song-col song-album">${songObj.artist}</div>
                        <div class="song-col song-duration">${formatSeconds(songObj.duration)}</div>
                    `;
                    
                    row.addEventListener('click', () => {
                        if (!songObj.src) songObj.src = `${BACKEND_URL}/stream/${songObj.id}`;
                        audioPlayer.queue = [...currentArtistSongs];
                        audioPlayer.playSong(songObj, index);
                        audioPlayer.bufferUpcomingSongs();
                    });
                    
                    songsList.appendChild(row);
                });
            } else {
                songsList.innerHTML = '<div style="text-align: center; color: var(--text-subdued);">No popular tracks found.</div>';
            }
            
            // Setup play all button
            playBtn.onclick = () => {
                if (currentArtistSongs.length > 0) {
                    const firstSong = currentArtistSongs[0];
                    if (!firstSong.src) firstSong.src = `${BACKEND_URL}/stream/${firstSong.id}`;
                    audioPlayer.queue = [...currentArtistSongs];
                    audioPlayer.playSong(firstSong, 0);
                    audioPlayer.bufferUpcomingSongs();
                }
            };
            
        } catch (e) {
            console.error("Error loading artist:", e);
            songsList.innerHTML = '<div style="text-align: center; color: var(--error);">Failed to load artist details.</div>';
        }
    }
    
    async function renderDownloads() {
        const listContainer = document.getElementById('downloads-list');
        const playAllContainer = document.getElementById('downloads-play-all-container');
        listContainer.innerHTML = '';
        
        try {
            const downloadedSongs = await musicDB.getAllDownloads();
            
            if (!downloadedSongs || downloadedSongs.length === 0) {
                playAllContainer.style.display = 'none';
                listContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>NO OFFLINE MUSIC</h3>
                        <p>Download tracks to listen without connection.</p>
                        <button class="cta-btn" onclick="document.querySelector('[data-view=\\'home\\']').click()">EXPLORE MUSIC</button>
                    </div>
                `;
                return;
            }
            
            playAllContainer.style.display = 'block';
            
            // Map the downloaded objects back into playable song objects
            const offlineQueue = downloadedSongs.map(item => {
                // We need to create a temporary URL for the Blob so AudioPlayer can play it
                let src = item.src;
                if (item.blob) {
                    src = window.URL.createObjectURL(item.blob);
                }
                
                return {
                    id: item.id,
                    title: item.title,
                    artist: item.artist,
                    cover: item.cover,
                    src: src,
                    lyrics: [],
                    isOffline: true
                };
            });
            
            offlineQueue.forEach((song, index) => {
                const row = document.createElement('div');
                row.className = 'song-row';
                
                row.innerHTML = `
                    <div class="song-col song-index">
                        <span class="index-num">${index + 1}</span>
                        <i class="fas fa-play play-icon"></i>
                    </div>
                    <div class="song-col song-title">
                        <img src="${song.cover}" alt="cover" loading="lazy">
                        <div>
                            <div class="title-text">${song.title}</div>
                        </div>
                    </div>
                    <div class="song-col song-album">${song.artist}</div>
                    <div class="song-col song-duration" style="justify-content: flex-end;">
                        <button class="remove-download-btn" data-id="${song.id}" style="background: none; border: none; color: var(--text-subdued); cursor: pointer; padding: 8px;" title="Remove Download"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                row.addEventListener('click', (e) => {
                    if(e.target.closest('.remove-download-btn')) return;
                    audioPlayer.queue = offlineQueue;
                    audioPlayer.playSong(song, index);
                });
                
                listContainer.appendChild(row);
            });
            
            // Add remove listener
            document.querySelectorAll('.remove-download-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id = e.currentTarget.getAttribute('data-id');
                    if (confirm("Remove this song from downloads?")) {
                        await musicDB.deleteDownload(id);
                        renderDownloads(); // refresh
                        
                        // Update download btn if playing
                        if (currentActiveSong && currentActiveSong.id === id) {
                            const dBtn = document.getElementById('download-btn');
                            if (dBtn) dBtn.style.color = 'var(--text-subdued)';
                        }
                    }
                });
            });
            
            // Play all logic
            const playAllBtn = document.getElementById('play-downloads-btn');
            if(playAllBtn) {
                // Remove old listeners to prevent stacking
                const newBtn = playAllBtn.cloneNode(true);
                playAllBtn.parentNode.replaceChild(newBtn, playAllBtn);
                newBtn.addEventListener('click', () => {
                    audioPlayer.queue = offlineQueue;
                    audioPlayer.playSong(offlineQueue[0], 0);
                });
            }
            
        } catch (err) {
            console.error("Failed to load downloads", err);
            listContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--error);">Failed to load downloads</div>';
        }
    }

    function parseLRC(lrcText) {
        const lines = lrcText.split('\\n');
        const lyrics = [];
        const timeRegEx = /\\[(\\d{2}):(\\d{2})\\.(\\d{2,3})\\]/;
        
        lines.forEach(line => {
            const match = timeRegEx.exec(line);
            if (match) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = parseInt(match[3]);
                
                // Convert ms based on whether it's 2 or 3 digits
                const msMultiplier = match[3].length === 2 ? 10 : 1;
                
                const timeInSeconds = (min * 60) + sec + ((ms * msMultiplier) / 1000);
                const text = line.replace(timeRegEx, '').trim();
                
                if (text) {
                    lyrics.push({ time: timeInSeconds, text });
                }
            }
        });
        
        return lyrics;
    }

    // =========================================
    // GLOBAL KEYBOARD SHORTCUTS
    // =========================================
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if user is typing in an input or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                document.getElementById('play-pause-btn')?.click();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                document.getElementById('prev-btn')?.click();
                break;
            case 'ArrowRight':
                e.preventDefault();
                document.getElementById('next-btn')?.click();
                break;
            case 'KeyM':
                document.getElementById('mute-btn')?.click();
                break;
            case 'Escape':
                // Exit expanded player if open
                const dock = document.querySelector('.player-dock');
                if (dock && dock.classList.contains('expanded')) {
                    document.getElementById('fullscreen-btn')?.click();
                }
                break;
        }
    });

});
