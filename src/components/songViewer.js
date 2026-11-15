/**
 * AROHA Guitar App - Song Viewer & PDF Sheet Indexer
 * Loads imported songs from local JSON index and renders interactive chord sheets.
 */

export class SongViewer {
    constructor(containerElementId) {
        this.container = document.getElementById(containerElementId);
        this.songs = [];
        this.currentSong = null;
    }

    async init() {
        try {
            const response = await fetch('/data/imported_songs.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            this.songs = await response.json();
            this.renderSongSelector();
            console.log(`[+] Loaded ${this.songs.length} imported songs into guitar app.`);
        } catch (error) {
            console.error("[-] Failed to load imported songs index:", error);
            if (this.container) {
                this.container.innerHTML = `<div class="error-msg">Failed to load imported songs. Run ingestion script first.</div>`;
            }
        }
    }

    renderSongSelector() {
        if (!this.container) return;

        let html = `
            <div class="aroha-song-workspace">
                <div class="song-sidebar">
                    <h3>Imported PDF Songs</h3>
                    <input type="text" id="song-search-input" placeholder="Search songs or chords..." />
                    <ul class="song-list" id="song-list-ul">
                        ${this.songs.map(song => `
                            <li data-id="${song.id}" class="song-list-item">
                                <span class="song-title">${song.title}</span>
                                <span class="song-chords-preview">${song.detected_chords.slice(0, 4).join(', ')}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="song-main-display" id="song-display-area">
                    <p class="placeholder-text">Select a song from your downloads library to view chords and source PDF.</p>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    attachEventListeners() {
        const searchInput = document.getElementById('song-search-input');
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.song-list-item');
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });

        const listItems = document.querySelectorAll('.song-list-item');
        listItems.forEach(item => {
            item.addEventListener('click', () => {
                listItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const songId = item.getAttribute('data-id');
                this.displaySong(songId);
            });
        });
    }

    displaySong(songId) {
        const song = this.songs.find(s => s.id === songId);
        if (!song) return;
        this.currentSong = song;

        const displayArea = document.getElementById('song-display-area');
        displayArea.innerHTML = `
            <div class="song-card">
                <h2>${song.title}</h2>
                <div class="chord-badge-container">
                    <strong>Detected Chords:</strong>
                    <div class="badges">
                        ${song.detected_chords.map(chord => `<span class="chord-pill">${chord}</span>`).join('')}
                    </div>
                </div>
                <div class="lyrics-preview">
                    <strong>Extracted Text Snippet:</strong>
                    <pre>${song.lyrics_snippet}</pre>
                </div>
                <div class="action-row">
                    <a href="/assets/songs/${song.source_pdf}" target="_blank" class="btn-open-pdf">Open Full PDF Sheet</a>
                </div>
            </div>
        `;
    }
}

