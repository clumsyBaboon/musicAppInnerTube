window.onload = () => {
    window.electronAPI.requirePlaylistWrapper();
}

const playlistWrapperTemplate = document.querySelector("#playlistWrapperTemplate");
const playlistWrapper = document.querySelector(".playlistWrapper");
const closePlaylistBtn = document.querySelector("#closePlaylist");

const songsWrapper = document.querySelector(".playlistViewWrapper .songs");
const songTemplate = document.querySelector("#songTemplate");

const library = [];
let openedPlaylist = "";
let animationOpeningPlaylist = false;
let songs = [];

const startLoadingAnimation = () => document.querySelector("#loading-playlist").style.display = "block";
const stopLoadingAnimation = () => document.querySelector("#loading-playlist").style.display = "none";

window.electronAPI.onPlaylistWrapper(data => {
    for (const element of data) {
        library.push(new Playlist(
            element.name, element.subtitle, element.id, element.imgHref, element.type
        ))
    }
})

closePlaylistBtn.addEventListener("click", () => {
    if (openedPlaylist == "" || animationOpeningPlaylist) return;
    for (const element of library) if (element.id == openedPlaylist) element.closePlaylist();
})

class Song {
    #song;
    constructor (name, author, index, imgHref, duration, id) {
        this.name = name;
        this.author = author;
        this.index = index;
        this.imgHref = imgHref;
        this.duration = duration;
        this.id = id;

        const clone = songTemplate.content.cloneNode(true);
        this.#song = clone.querySelector(".song");
        this.#song.querySelector("h1").textContent = this.name;
        this.#song.querySelector("h2").textContent = this.author;
        this.#song.querySelector(".index").textContent = this.index + 1;
        this.#song.querySelector(".song-img").src = this.imgHref;
        this.#song.querySelector(".duration").textContent = this.duration;
        this.#song.onclick = () => this.startSong();
        songsWrapper.appendChild(this.#song);
    }

    async startSong() {
        window.electronAPI.startSong({
            id: this.id
        })
    }
}

class Playlist {
    #playlist;
    constructor (name, subtitle, id, imgHref, type) {
        this.name = name;
        this.subtitle = subtitle;
        this.id = id;
        this.imgHref = imgHref;
        this.type = type;
        const clone = playlistWrapperTemplate.content.cloneNode(true);
        this.#playlist = clone.querySelector(".playlist");
        this.#playlist.querySelector("h1").textContent = this.name;
        this.#playlist.querySelector("h2").textContent = this.subtitle;
        this.#playlist.querySelector("img").src = this.imgHref;
        this.#playlist.onclick = () => this.openPlaylist()
        playlistWrapper.appendChild(this.#playlist);
    }

    async openPlaylist() {
        if (animationOpeningPlaylist) return;
        animationOpeningPlaylist = true;

        // close opened playlist
        if (openedPlaylist != "") {
            for (const element of library) if (element.id == openedPlaylist) {
                const elementReturn = element.closePlaylist();
                if (elementReturn) await this.#waitForAnimation(document.querySelector(".mainPlaylist"));
                break;
            }
        }

        startLoadingAnimation();

        songsWrapper.querySelectorAll(".song").forEach(element => element.remove());
        songs = [];

        const loadedSongs = await window.electronAPI.loadSongs({
            type: this.type,
            id: this.id
        })
        if (loadedSongs) {
            console.log(loadedSongs);
            for (const [index, element] of loadedSongs.entries()) songs.push(new Song(
                element.name, element.author, index, element.imgHref, element.duration, element.id
            ))
        }

        document.querySelector("#playlistName").textContent = this.name;

        stopLoadingAnimation();

        const mainPlaylist = document.querySelector(".mainPlaylist");
        const positionFrom = this.#playlist.querySelector("img").getBoundingClientRect();
        const positionTo = mainPlaylist.getBoundingClientRect();

        const x = (positionFrom.x + positionFrom.width / 2) - (positionTo.x + positionTo.width / 2);
        const y = (positionFrom.y + positionFrom.height / 2) - (positionTo.y + positionTo.height / 2);
        const scale = positionFrom.width / positionTo.width;
        console.log(`X: ${x}, Y: ${y}, SCALE: ${scale}, ${positionFrom.width}, ${positionTo.width}`);
        document.documentElement.style.setProperty("--position-x-playlist", `${x}px`);
        document.documentElement.style.setProperty("--position-y-playlist", `${y}px`);
        document.documentElement.style.setProperty("--scale-playlist", String(scale));

        this.#playlist.querySelector("img").style.opacity = "0";

        openedPlaylist = this.id;

        document.documentElement.style.setProperty("--playlist-view-wrapper-opacity", "1");

        mainPlaylist.querySelector("div.front").style.backgroundImage = `url(${this.imgHref})`;
        mainPlaylist.querySelector("div.back").style.backgroundImage = `url(${this.imgHref})`;
        mainPlaylist.style.opacity = "1";
        mainPlaylist.classList.add("animationOpen");
        mainPlaylist.addEventListener("animationend", () => {
            animationOpeningPlaylist = false;
            mainPlaylist.classList.remove("animationOpen");
        }, { once: true })
    }

    closePlaylist() {
        openedPlaylist = "";
        const mainPlaylist = document.querySelector(".mainPlaylist");
        const positionTo = this.#playlist.querySelector("img").getBoundingClientRect();
        const positionFrom = mainPlaylist.getBoundingClientRect();
        document.documentElement.style.setProperty("--playlist-view-wrapper-opacity", "0");
        if (positionTo.y > 0 && positionTo.y < window.innerHeight) {
            const x = (positionTo.x + positionTo.width / 2) - (positionFrom.x + positionFrom.width / 2);
            const y = (positionTo.y + positionTo.height / 2) - (positionFrom.y + positionFrom.height / 2);
            const scale = positionTo.width / positionFrom.width;
            document.documentElement.style.setProperty("--position-x-playlist", `${x}px`);
            document.documentElement.style.setProperty("--position-y-playlist", `${y}px`);
            document.documentElement.style.setProperty("--scale-playlist", String(scale));
            mainPlaylist.classList.add("animationClose");
            mainPlaylist.addEventListener("animationend", () => {
                mainPlaylist.classList.remove("animationClose");
                mainPlaylist.style.opacity = "0";
                this.#playlist.querySelector("img").style.opacity = "1";
            }, { once: true })
            return true;
        } else {
            mainPlaylist.style.opacity = "0";
            this.#playlist.querySelector("img").style.opacity = "1";
            return false;
        }
    }

    #waitForAnimation(element) {
        return new Promise(resolve => element.addEventListener("animationend", resolve, { once: true }));
    }
}