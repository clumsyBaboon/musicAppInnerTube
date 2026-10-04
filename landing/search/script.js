const searchInput = document.querySelector("#search-input");
const loading = document.querySelector("#search-loading");

const mainSongTemplate = document.querySelector("#main-song-template");
const regularSongTemplate = document.querySelector("#reqular-song-template");
const mainArtistTemplate = document.querySelector("#main-artist-template");
const regularArtistTemplate = document.querySelector("#regular-artist-template");
const resultWrapper = document.querySelector(".result");

const contextSearch = document.querySelector("#context-search");

let result = [];

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
        this.#song.querySelector(".shuffle").onclick = () => console.log("Shuffle");
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
        this.#song.querySelector("img.more").onclick = event => this.openContextMenu(event);
        this.#song.addEventListener("contextmenu", event => this.openContextMenu(event));
        resultWrapper.appendChild(this.#song);
    }

    openContextMenu(event) {
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
        btnPlayNext.onclick = event => this.doAnimationContextMenu(event, btnPlayNext, "play-next");
        const btnAddToQueue = contextSearch.querySelector(".add-to-queue");
        btnAddToQueue.onclick = event => this.doAnimationContextMenu(event, btnAddToQueue, "add-to-queue")
        window.addEventListener("click", () => {
            contextSearch.style.display = "none";
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
            case "play-next": window.electronAPI.playNextIdOnly(this.id); break;
            case "add-to-queue": window.electronAPI.addToQueueIdOnly(this.id); break;
        }
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
        resultWrapper.appendChild(this.#song);
    }
}