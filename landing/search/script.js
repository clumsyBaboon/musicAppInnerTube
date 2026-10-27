const searchInput = document.querySelector("#search-input");
const loading = document.querySelector("#search-loading");

const mainSongTemplate = document.querySelector("#main-song-template");
const regularSongTemplate = document.querySelector("#reqular-song-template");
const mainArtistTemplate = document.querySelector("#main-artist-template");
const regularArtistTemplate = document.querySelector("#regular-artist-template");
const mainAlbumTemplate = document.querySelector("#main-album-template");
const regularAlbumTemplate = document.querySelector("#regular-album-template");
const resultWrapper = document.querySelector(".result");
const songsWrapper = document.querySelector(".albumDiv .songs");
const songAlbumTemplate = document.querySelector(".albumDiv #song-album-template");

const contextSearch = document.querySelector("#context-search");

let escAction = () => {};
document.addEventListener("keydown", event => {
    if (event.key == "Escape") escAction();
})

const artistDiv = document.querySelector(".artist");
const albumDiv = document.querySelector(".albumDiv");
artistDiv.querySelector("#closeArtist").addEventListener("click", closeArtist);
albumDiv.querySelector("#closeAlbum").addEventListener("click", closeAlbum);

let result = [];

let isArtistOpen = false;
let isAlbumOpen = false;

searchInput.addEventListener("keydown", async event => {
    if (event.key == "Enter") {
        loading.style.display = "block";
        document.querySelectorAll(".result .song").forEach(element => element.remove());
        result = [];
        var response = await window.electronAPI.requireSearch(searchInput.value);
        loading.style.display = "none";
        console.log(response);
        for (const element of response) {
            switch (element.type) {
                case "main_song": {
                    result.push(new ResultSongMain(element.id, element.title, element.subtitle, element.imgHref));
                    break;
                }
                case "regular_song": {
                    result.push(new ResultSongRegular(element.id, element.title, element.author, element.imgHref));
                    break;
                }
                case "main_artist": {
                    result.push(new ResultArtistMain(element.id, element.title, element.subtitle, element.imgHref));
                    break;
                }
                case "regular_artist": {
                    result.push(new ResultArtistRegular(element.id, element.title, element.subtitle, element.imgHref));
                    break;
                }
                case "main_album": {
                    result.push(new ResultAlbumMain(element.id, element.title, element.subtitle, element.imgHref));
                    break;
                }
                case "regular_album": {
                    result.push(new ResultAlbumRegular(element.id, element.title, element.subtitle, element.imgHref));
                    break;
                }
            }
        }
    }
})

function hideContextMenu() {
    contextSearch.style.animation = "hide-context-menu 200ms linear";
    contextSearch.addEventListener("animationend", () => {
        contextSearch.style.display = "none";
        contextSearch.style.animation = "none";
    }, { once: true });
}

function openContextMenu(event, id, isAlbum = false) {
    event.stopPropagation();
    contextSearch.style.display = "flex";
    const menuWidth = contextSearch.offsetWidth;
    const menuHeight = contextSearch.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let left = event.clientX;
    let top = event.clientY;
    if (left + menuWidth > windowWidth) left = windowWidth - menuWidth - 5;
    if (top + menuHeight > windowHeight) top = windowHeight - menuHeight - 5;
    contextSearch.style.left = `${left}px`;
    contextSearch.style.top = `${top}px`;
    const btnPlayNext = contextSearch.querySelector(".play-next");
    btnPlayNext.onclick = event => doAnimationContextMenu(event, btnPlayNext, isAlbum ? "play-next-album" : "play-next", id);
    const btnAddToQueue = contextSearch.querySelector(".add-to-queue");
    btnAddToQueue.onclick = event => doAnimationContextMenu(event, btnAddToQueue, isAlbum ? "add-to-queue-album" : "add-to-queue", id)
    window.addEventListener("click", () => {
        contextSearch.style.display = "none";
    }, { once: true });
}

function doAnimationContextMenu(event, btn, action, id) {
    event.stopPropagation();
    btn.classList.add("clicked");
    setTimeout(() => {
        btn.classList.remove("clicked");
        setTimeout(() => hideContextMenu(), 50);
    }, 50)
    switch (action) {
        case "play-next": window.electronAPI.playNextIdOnly(id); break;
        case "add-to-queue": window.electronAPI.addToQueueIdOnly(id); break;
        case "play-next-album": window.electronAPI.playNextAlbumIdOnly(id); break;
        case "add-to-queue-album": window.electronAPI.addToQueueAlbumIdOnly(id); break;
    }
}

async function openArtist(id) {
    if (isArtistOpen) return;
    isArtistOpen = true;
    escAction = closeArtist;

    const data = await window.electronAPI.requireArtist(id);
    console.log(data);
    if (data) {
        artistDiv.querySelector(".header img.bg").src = data.header.imgHref;
        artistDiv.querySelector(".header h1").textContent = data.header.title;
        artistDiv.querySelector(".header .shuffle").onclick = () => window.electronAPI.shuffleArtist(id);
        //topSongs
        document.querySelectorAll(".artist .top-songs .top-song").forEach(element => element.remove());
        for (const element of data.topSongs) {
            const clone = document.querySelector("#top-song-template").content.cloneNode(true).querySelector(".top-song");
            clone.querySelector("img").src = element.imgHref;
            clone.querySelector(".title").textContent = element.title;
            clone.querySelector(".author").textContent = element.author;
            clone.querySelector(".plays").textContent = element.plays;
            clone.querySelector(".album").textContent = element.album;
            clone.querySelector("img.more").onclick = event => openContextMenu(event, element.id);
            clone.addEventListener("contextmenu", event => openContextMenu(event, element.id));
            clone.querySelector(".album-play").onclick = () => window.electronAPI.startSongIdOnly(element.id);
            document.querySelector(".artist .top-songs").appendChild(clone);
        }
        //albums
        document.querySelectorAll(".artist .albums .wrapper .album-artist").forEach(element => element.remove());
        for (const element of data.albums) {
            const clone = document.querySelector(".artist #album-artist-template").content.cloneNode(true).querySelector(".album-artist");
            clone.querySelector("img").src = element.imgHref;
            clone.querySelector("h1").textContent = element.title;
            clone.querySelector("h2").textContent = element.year;
            clone.onclick = () => openAlbum(element.id);
            clone.addEventListener("contextmenu", event => openContextMenu(event, element.id, true));
            document.querySelector(".artist .albums .wrapper").appendChild(clone);
        }
    }

    artistDiv.style.zIndex = "6";
    artistDiv.style.opacity = "1";
    artistDiv.classList.add("openAnimation");
    artistDiv.addEventListener("animationend", () => artistDiv.classList.remove("openAnimation"), { once: true });
}
function closeArtist() {
    isArtistOpen = false;
    artistDiv.classList.add("closeAnimation");
    artistDiv.addEventListener("animationend", () => {
        artistDiv.classList.remove("closeAnimation");
        artistDiv.style.zIndex = "0";
        artistDiv.style.opacity = "0";
    }, { once: true });
    escAction = () => {};
}

async function openAlbum(id) {
    if (isAlbumOpen) return;
    isAlbumOpen = true;
    escAction = closeAlbum;

    songsWrapper.querySelectorAll(".song-album").forEach(element => element.remove());
    const data = await window.electronAPI.loadSongs({
        type: "album",
        id
    })
    console.log(data);
    if (data) {
        albumDiv.querySelector(".albumImg").src = data.imgHref;
        albumDiv.querySelector("#albumName").textContent = data.title;
        albumDiv.querySelector("#author").textContent = data.author;
        albumDiv.querySelector("#subtitle").textContent = data.subtitle;
        albumDiv.querySelector("#subtitle-2").textContent = data.subtitle2;
        albumDiv.querySelector(".start-album").onclick = () => window.electronAPI.startAlbumIdOnly(id);
        for (const [index, element] of data.data.entries()) {
            const clone = songAlbumTemplate.content.cloneNode(true).querySelector(".song-album");
            clone.querySelector(".index").textContent = index + 1;
            clone.querySelector(".song-img").src = element.imgHref;
            clone.querySelector(".textWrapper h1").textContent = element.name;
            clone.querySelector(".textWrapper h2").textContent = element.plays; // change on plays
            clone.querySelector(".duration").textContent = element.duration;
            clone.onclick = () => window.electronAPI.startSongIdOnly(element.id);
            clone.addEventListener("contextmenu", event => openContextMenu(event, element.id));
            clone.querySelector("img.more").onclick = event => openContextMenu(event, element.id);
            songsWrapper.appendChild(clone);
        }
    }

    albumDiv.style.zIndex = "7";
    albumDiv.style.opacity = "1";
    albumDiv.classList.add("openAnimation");
    albumDiv.addEventListener("animationend", () => albumDiv.classList.remove("openAnimation"), { once: true });
}
function closeAlbum() {
    isAlbumOpen = false;
    albumDiv.classList.add("closeAnimation");
    albumDiv.addEventListener("animationend", () => {
        albumDiv.classList.remove("closeAnimation");
        albumDiv.style.zIndex = "0";
        albumDiv.style.opacity = "0";
    }, { once: true });
    if (isArtistOpen) escAction = closeArtist;
    else escAction = () => {};
}

class ResultSongMain {
    #song;
    constructor (id, title, subtitle, imgHref) {
        this.id = id;
        this.#song = mainSongTemplate.content.cloneNode(true).querySelector(".main-song");
        this.#song.querySelector("h1").textContent = title;
        this.#song.querySelector("h2").textContent = subtitle;
        this.#song.querySelector(".bg").src = imgHref;
        this.#song.querySelector(".album").src = imgHref;
        this.#song.querySelector(".play").onclick = () => window.electronAPI.startSongIdOnly(id);
        this.#song.querySelector(".play-next").onclick = () => window.electronAPI.playNextIdOnly(id);
        this.#song.querySelector(".add-to-queue").onclick = () => window.electronAPI.addToQueueIdOnly(id);
        resultWrapper.appendChild(this.#song);
    }
}

class ResultArtistMain {
    #song;
    constructor (id, title, subtitle, imgHref) {
        this.id = id;
        this.#song = mainArtistTemplate.content.cloneNode(true).querySelector(".main-artist");
        this.#song.querySelector("h1").textContent = title;
        this.#song.querySelector("h2").textContent = subtitle;
        this.#song.querySelector(".bg").src = imgHref;
        this.#song.querySelector(".album").src = imgHref;
        this.#song.querySelector(".shuffle").onclick = event => {
            event.stopPropagation();
            window.electronAPI.shuffleArtist(this.id);
        }
        this.#song.onclick = () => openArtist(this.id);
        resultWrapper.appendChild(this.#song);
    }
}

class ResultAlbumMain {
    #song;
    constructor (id, title, subtitle, imgHref) {
        this.id = id;
        this.#song = mainAlbumTemplate.content.cloneNode(true).querySelector(".main-song");
        this.#song.querySelector("h1").textContent = title;
        this.#song.querySelector("h2").textContent = subtitle;
        this.#song.querySelector(".bg").src = imgHref;
        this.#song.querySelector(".album").src = imgHref;
        this.#song.querySelector(".play").onclick = event => {
            event.stopPropagation();
            window.electronAPI.startAlbumIdOnly(this.id);
        }
        this.#song.onclick = () => openAlbum(this.id);
        this.#song.querySelector(".play-next").onclick = event => {
            event.stopPropagation();
            window.electronAPI.playNextAlbumIdOnly(id);
        }
        this.#song.querySelector(".add-to-queue").onclick = event => {
            event.stopPropagation();
            window.electronAPI.addToQueueAlbumIdOnly(id);
        }
        resultWrapper.appendChild(this.#song);
    }
}

class ResultSongRegular {
    #song;
    constructor (id, title, author, imgHref) {
        this.id = id;
        this.#song = regularSongTemplate.content.cloneNode(true).querySelector(".regular-song");
        this.#song.querySelector("h1").textContent = title;
        this.#song.querySelector("h2").textContent = author;
        this.#song.querySelector(".album").src = imgHref;
        this.#song.querySelector(".album-play").onclick = () => window.electronAPI.startSongIdOnly(id);
        this.#song.querySelector("img.more").onclick = event => openContextMenu(event, this.id);
        this.#song.addEventListener("contextmenu", event => openContextMenu(event, this.id));
        resultWrapper.appendChild(this.#song);
    }
}

class ResultArtistRegular {
    #song;
    constructor (id, title, subtitle, imgHref) {
        this.id = id;
        this.#song = regularArtistTemplate.content.cloneNode(true).querySelector(".regular-artist");
        this.#song.querySelector("h1").textContent = title;
        this.#song.querySelector("h2").textContent = subtitle;
        this.#song.querySelector(".album").src = imgHref;
        this.#song.onclick = () => openArtist(this.id);
        resultWrapper.appendChild(this.#song);
    }
}

class ResultAlbumRegular {
    #song;
    constructor (id, title, author, imgHref) {
        this.id = id;
        this.#song = regularAlbumTemplate.content.cloneNode(true).querySelector(".regular-song");
        this.#song.querySelector("h1").textContent = title;
        this.#song.querySelector("h2").textContent = author;
        this.#song.querySelector(".album").src = imgHref;
        this.#song.onclick = () => openAlbum(this.id);
        this.#song.querySelector("img.more").onclick = event => openContextMenu(event, this.id, true);
        this.#song.addEventListener("contextmenu", event => openContextMenu(event, this.id, true));
        resultWrapper.appendChild(this.#song);
    }
}