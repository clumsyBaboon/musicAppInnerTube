window.onload = () => {
    window.electronAPI.requirePlaylistWrapper();
}

const playlistWrapperTemplate = document.querySelector("#playlistWrapperTemplate");
const playlistWrapper = document.querySelector(".playlistWrapper");
const closePlaylistBtn = document.querySelector("#closePlaylist");

const library = [];
let openedPlaylist = "";
let animationOpeningPlaylist = false;

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

        if (openedPlaylist != "") {
            for (const element of library) if (element.id == openedPlaylist) {
                const elementReturn = element.closePlaylist();
                if (elementReturn) await this.#waitForAnimation(document.querySelector(".mainPlaylist"));
                break;
            }
        }

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