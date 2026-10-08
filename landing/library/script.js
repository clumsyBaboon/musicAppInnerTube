window.addEventListener("load", () => {
  window.electronAPI.requirePlaylistWrapper();
})

const playlistWrapperTemplate = document.querySelector("#playlistWrapperTemplate");
const playlistWrapper = document.querySelector(".playlistWrapper");
const closePlaylistBtn = document.querySelector("#closePlaylist");

const contextPlaylist = document.querySelector("#context-playlist");

const songsWrapper = document.querySelector(".playlistViewWrapper .songs");
const songTemplate = document.querySelector("#songTemplate");

const library = [];
let openedPlaylist = "";
let animationOpeningPlaylist = false;
let songs = [];

const startLoadingAnimation = () => document.querySelector("#loading-playlist").style.display = "block";
const stopLoadingAnimation = () => document.querySelector("#loading-playlist").style.display = "none";
document.querySelector(".start-playlist").addEventListener("click", () => {
    if (songs) songs[0].startSong();
})

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

function calcAnimation(positionFrom, positionTo) {
    const x = (positionFrom.x + positionFrom.width / 2) - (positionTo.x + positionTo.width / 2);
    const y = (positionFrom.y + positionFrom.height / 2) - (positionTo.y + positionTo.height / 2);
    const scale = positionFrom.width / positionTo.width;
    return [x, y, scale];
}

function hideContextMenu() {
    contextPlaylist.style.animation = "hide-context-menu 200ms linear";
    contextPlaylist.addEventListener("animationend", () => {
        contextPlaylist.style.display = "none";
        contextPlaylist.style.animation = "none";
    }, { once: true });
}

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
        this.#song.querySelector("img.more").onclick = event => this.openContextMenu(event);
        this.#song.addEventListener("contextmenu", event => this.openContextMenu(event));
        songsWrapper.appendChild(this.#song);
    }

    async startSong() {
        const queue = songs.map(item => Object.assign({}, item));
        queue.forEach(element => delete element.index);
        window.electronAPI.startSong({
            id: this.id,
            queue,
            index: this.index
        })
    }

    openContextMenu(event) {
        event.stopPropagation();
        contextPlaylist.style.display = "flex";
        const menuWidth = contextPlaylist.offsetWidth;
        const menuHeight = contextPlaylist.offsetHeight;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        let left = event.clientX;
        let top = event.clientY;
        if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 5;
        if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 5;
        contextPlaylist.style.left = `${left}px`;
        contextPlaylist.style.top = `${top}px`;
        const btnPlayNext = contextPlaylist.querySelector(".play-next");
        btnPlayNext.onclick = event => this.doAnimationContextMenu(event, btnPlayNext, "play-next");
        const btnAddToQueue = contextPlaylist.querySelector(".add-to-queue");
        btnAddToQueue.onclick = event => this.doAnimationContextMenu(event, btnAddToQueue, "add-to-queue")
        window.addEventListener("click", () => {
            contextPlaylist.style.display = "none";
        }, { once: true });
    }

    doAnimationContextMenu(event, btn, action) {
        event.stopPropagation();
        btn.classList.add("clicked");
        setTimeout(() => {
            btn.classList.remove("clicked");
            setTimeout(() => hideContextMenu(), 50);
        }, 50)
        switch (action) {
            case "play-next": {
                const data = Object.assign({}, songs[this.index]);
                delete data.index;
                window.electronAPI.playNext(data);
                break;
            }
            case "add-to-queue": {
                const data = Object.assign({}, songs[this.index]);
                delete data.index;
                window.electronAPI.addToQueue(data);
                break;
            }
        }
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
            for (const [index, element] of loadedSongs.data.entries()) songs.push(new Song(
                element.name, element.author, index, element.imgHref, element.duration, element.id
            ))
            document.querySelector(".playlistViewWrapper #subtitle").textContent = loadedSongs.subtitle;
            document.querySelector(".playlistViewWrapper #subtitle-2").textContent = loadedSongs.subtitle2;
        }

        document.querySelector("#playlistName").textContent = this.name;

        stopLoadingAnimation();

        const mainPlaylist = document.querySelector(".mainPlaylist");
        const positionFrom = this.#playlist.querySelector("img").getBoundingClientRect();
        const positionTo = mainPlaylist.getBoundingClientRect();

        const [x, y, scale] = calcAnimation(positionFrom, positionTo);
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
        const positionFrom = this.#playlist.querySelector("img").getBoundingClientRect();
        const positionTo = mainPlaylist.getBoundingClientRect();
        document.documentElement.style.setProperty("--playlist-view-wrapper-opacity", "0");
        if (positionFrom.y > 0 && positionFrom.y < window.innerHeight) {

            const [x, y, scale] = calcAnimation(positionFrom, positionTo);
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