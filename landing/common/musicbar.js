const btnPrev = document.querySelector(".musicbar .btn-prev");
const btnNext = document.querySelector(".musicbar .btn-next");
const btnPlayPause = document.querySelector(".musicbar .btn-play-pause");
const albumImg = document.querySelector(".musicbar .wrapper-small .album");
const albumImgBig = document.querySelector(".musicbar .wrapper-big .album");
const title = document.querySelector(".musicbar .wrapper-small h1");
const author = document.querySelector(".musicbar .wrapper-small h2");
const currentTime = document.querySelector(".musicbar .wrapper-big .current");
const duration = document.querySelector(".musicbar .wrapper-big .duration");
const songQueueTemplate = document.querySelector(".musicbar #queue-song");
const queueList = document.querySelector(".musicbar .queue-list");
const lyricsList = document.querySelector(".musicbar .lyrics-list");

const queueButton = document.querySelector(".musicbar #queue-btn");
const lyricsButton = document.querySelector(".musicbar #lyrics-btn");

let isBigMusicbarOpen = false;
let isLyricsOpened = false;
let isVolumeOn = true;
let lastId = null;
let waitForNext = false;

let queue = [];
let nowPlaying = -1;

let putAfter = null;
let dragIndex = 0;

let lastLyrName = null;
let lastLyr = null;
let lyricsGlobal = null;
let lyrcisType = 0; // 0 none, 1 plain, 2 synced

const volumeRange = document.querySelector(".musicbar #volume-range-small");
const volumeBtn = document.querySelector(".musicbar .volume");
function updateVolumeIcon() {
    if (isVolumeOn) {
        if (volumeRange.value == 0) var volumeType = 0;
        else if (volumeRange.value < volumeRange.max * 0.33) var volumeType = 1;
        else if (volumeRange.value < volumeRange.max * 0.66) var volumeType = 2;
        else var volumeType = 3;
    } else var volumeType = -1;
    const url = `url(../img/speaker${volumeType}.svg)`;
    volumeBtn.style.backgroundImage = url;
}
function updateVolumeRange() {
    const value = volumeRange.value / (volumeRange.max - volumeRange.min);
    document.documentElement.style.setProperty("--volume-filled-percent", value);
}
function setVolume() {
    window.electronAPI.setVolume({
        isVolumeOn, value: volumeRange.value
    })
}
volumeRange.addEventListener("input", () => {
    if (!isVolumeOn) isVolumeOn = true;
    updateVolumeRange();
    updateVolumeIcon();
    setVolume();
})
volumeRange.addEventListener("pointerdown", () => volumeRange.classList.add("is-dragging"));
volumeRange.addEventListener("pointerup", () => volumeRange.classList.remove("is-dragging"));
volumeBtn.addEventListener("click", () => {
    isVolumeOn = !isVolumeOn;
    updateVolumeIcon();
    setVolume();
})

const timelineRange = document.querySelector(".musicbar #timeline-range");
let isTimelineRangeDragging = false;
function updateTimelineRange() {
    const value = timelineRange.value / (timelineRange.max - timelineRange.min);
    document.documentElement.style.setProperty("--timeline-filled-percent", value);
}
timelineRange.addEventListener("input", updateTimelineRange);
timelineRange.addEventListener("pointerdown", () => {
    timelineRange.classList.add("is-dragging");
    isTimelineRangeDragging = true;
})
timelineRange.addEventListener("pointerup", () => {
    timelineRange.classList.remove("is-dragging");
    isTimelineRangeDragging = false;
    window.electronAPI.seekTo(timelineRange.value);
});

window.addEventListener("load", async() => {
    const volume = await window.electronAPI.requireVolume();
    isVolumeOn = volume.isVolumeOn;
    volumeRange.value = volume.value;
    updateVolumeIcon();
    updateVolumeRange();
})

function calcAnimation(positionFrom, positionTo) {
    const x = (positionFrom.x + positionFrom.width / 2) - (positionTo.x + positionTo.width / 2);
    const y = (positionFrom.y + positionFrom.height / 2) - (positionTo.y + positionTo.height / 2);
    const scale = positionFrom.width / positionTo.width;
    return [x, y, scale];
}

function secToMin(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec) % 60;
    const paddedSeconds = String(seconds).padStart(2, "0");
    return `${minutes}:${paddedSeconds}`;
}

// STATE
window.electronAPI.onStateUpdate(data => {
    if (btnPlayPause.disabled) {
        btnPlayPause.disabled = false;
        document.documentElement.style.setProperty("--opacity-music-bar", "1");
        updateVolumeIcon();
    }
    btnPlayPause.style.backgroundImage = data.isNowPlaying ? "url(../img/pause.svg)" : "url(../img/play.svg)";
    albumImg.src = data.imgHref;
    albumImgBig.src = data.imgHref;
    title.textContent = data.title;
    author.textContent = data.artist;
    timelineRange.max = Math.floor(data.duration);
    duration.textContent = secToMin(Math.floor(data.duration));
    if (queue && isBigMusicbarOpen) {
        for (const [index, element] of queue.entries()) if (index != nowPlaying) element.clearPlaying();
        queue[nowPlaying].makePlaying();
    }
    if (nowPlaying != data.nowPlaying) waitForNext = false;
    nowPlaying = data.nowPlaying;
    if (!waitForNext) {
        btnPrev.disabled = data.prevBtnDisabled ? true : false;
        btnNext.disabled = data.nextBtnDisabled ? true : false;
    }
    currentTime.textContent = secToMin(Math.floor(data.currentTime));
    if (!isTimelineRangeDragging) timelineRange.value = data.currentTime;
    if (isLyricsOpened && isBigMusicbarOpen) updateLyrics(Math.floor(data.currentTime * 1000));
    if (isLyricsOpened && lastLyrName != data.title) loadNewLyrics();
    updateTimelineRange();
})

btnPlayPause.addEventListener("click", () => window.electronAPI.playPause());
btnNext.addEventListener("click", () => {
    btnNext.disabled = true;
    btnPrev.disabled = true;
    waitForNext = true;
    window.electronAPI.next();
})
btnPrev.addEventListener("click", () => {
    btnNext.disabled = true;
    btnPrev.disabled = true;
    waitForNext = true;
    window.electronAPI.prev();
});

queueList.addEventListener("dragstart", event => {
    const items = Array.from(document.querySelectorAll(".musicbar .queue-list li"));
    dragIndex = items.indexOf(event.target);
    event.target.classList.add("dragging");
})
queueList.addEventListener("dragend", event => {
    event.target.classList.remove("dragging");
    document.querySelectorAll(".musicbar .queue-list li").forEach(element => element.classList.remove("put-after"));
    if (putAfter) {
        const items = Array.from(document.querySelectorAll(".musicbar .queue-list .song"));
        const fromIndex = dragIndex - 1;
        const targIndex = items.indexOf(putAfter);
        const toIndex = fromIndex < targIndex ? targIndex : targIndex + 1;
        const [element] = queue.splice(fromIndex, 1);
        queue.splice(toIndex, 0, element);
        const newQueue = queue.map(item => Object.assign({}, item));
        newQueue.forEach(element => delete element.index)
        //give new now playing
        if (nowPlaying == fromIndex) nowPlaying = toIndex;
        else if (fromIndex < toIndex && nowPlaying > fromIndex && nowPlaying <= toIndex) nowPlaying--;
        else if (fromIndex > toIndex && nowPlaying >= toIndex && nowPlaying < fromIndex) nowPlaying++;
        for (const [index, element] of queue.entries()) element.setIndex(index);
        window.electronAPI.newQueue({
            newQueue, nowPlaying
        })
        putAfter.after(event.target);
    }
})
queueList.addEventListener("dragover", event => {
    event.preventDefault();
    putAfter = findClosest(event.clientY);
})
function findClosest(y) {
    const allLi = document.querySelectorAll(".musicbar .queue-list li");
    let closest = null;
    for (const [index, element] of allLi.entries()) {
        const box = element.getBoundingClientRect();
        if (box.y < y && box.y + box.height + 5 > y && index != dragIndex - 1 && index != dragIndex) {
            element.classList.add("put-after");
            closest = element;
        } else element.classList.remove("put-after");
    }
    return closest;
}

window.electronAPI.onNewQueue(data => {
    if (isBigMusicbarOpen) newQueue(data);
})
function newQueue(tempQueue) {
    queueList.querySelectorAll(".song").forEach(element => element.remove());
    queue = [];
    if (tempQueue) {
        for (const [index, element] of tempQueue.queue.entries()) queue.push(new SongQueue(
            element.name, element.author, index, element.imgHref, element.duration, element.id
        ))
        nowPlaying = tempQueue.nowPlaying;
        queue[nowPlaying].makePlaying();
        queue[nowPlaying].scrollToThis();
    }
}
document.querySelector(".musicbar .open-close").addEventListener("click", async () => {
    isBigMusicbarOpen = !isBigMusicbarOpen;
    if (isBigMusicbarOpen) {
        const tempQueue = await window.electronAPI.requireQueue();
        newQueue(tempQueue);
        if (isLyricsOpened) loadNewLyrics();
    }
    document.querySelector(".musicbar").style.height = isBigMusicbarOpen ? "calc(100% - 40px)" : "70px";
    document.querySelector(".musicbar .open-close").style.transform = isBigMusicbarOpen ? "rotate(180deg)" : "rotate(0deg)";
    document.documentElement.style.setProperty("--backdrop-brightness", isBigMusicbarOpen ? "0.35" : "0.7");
    //animation
    const positionFrom = albumImg.getBoundingClientRect();
    const positionTo = albumImgBig.getBoundingClientRect();
    const [x, y, scale] = calcAnimation(positionFrom, positionTo);
    document.documentElement.style.setProperty("--position-x-playlist-musicbar", `${x}px`);
    document.documentElement.style.setProperty("--position-y-playlist-musicbar", `${y}px`);
    document.documentElement.style.setProperty("--scale-playlist-musicbar", String(scale));
    if (isBigMusicbarOpen) {
        albumImg.style.opacity = "0";
        albumImgBig.style.opacity = "1";
        albumImgBig.classList.add("animationOpen");
        albumImgBig.addEventListener("animationend", () => {
            document.documentElement.style.setProperty("--opacity-big-music-bar", "1");
            albumImgBig.classList.remove("animationOpen");
        }, { once: true })
    } else {
        document.documentElement.style.setProperty("--opacity-big-music-bar", "0");
        albumImgBig.classList.add("animationClose");
        albumImgBig.addEventListener("animationend", () => {
            albumImg.style.opacity = "1";
            albumImgBig.style.opacity = "0";
            albumImgBig.classList.remove("animationClose");
        }, { once: true })
    }
})

queueButton.addEventListener("click", () => {
    if (isLyricsOpened) {
        lyricsButton.classList.remove("active");
        queueButton.classList.add("active");
        lyricsList.style.display = "none";
        queueList.style.display = "block";
    }
    isLyricsOpened = false;
})
lyricsButton.addEventListener("click", () => {
    if (!isLyricsOpened) {
        lyricsButton.classList.add("active");
        queueButton.classList.remove("active");
        lyricsList.style.display = "flex";
        queueList.style.display = "none";
        loadNewLyrics();
    }
    isLyricsOpened = true;
})
async function loadNewLyrics() {
    document.querySelectorAll(".musicbar .lyrics-list p").forEach(element => element.remove());
    const loadElement = document.createElement("p");
    loadElement.classList.add("active");
    loadElement.textContent = "Loading...";
    lyricsList.insertBefore(loadElement, lyricsList.lastElementChild);
    
    lyricsGlobal = null;

    const _title = title.textContent;
    const _author = author.textContent;
    const _duration = timelineRange.max;
    lastLyrName = _title;
    if (!_title || !_author || !_duration) return;
    const [type, lyrics] = await window.electronAPI.requireLyrics({
        title: _title, author: _author, duration: _duration
    })
    switch (type) {
        case "error": {
            loadElement.textContent = `Error: ${lyrics}`;
            lyrcisType = 0;
            break;
        }
        case "no_lyr" : {
            loadElement.textContent = "No lyrics found";
            lyrcisType = 0;
            break;
        }
        case "plain": {
            loadElement.remove();
            for (const element of lyrics) {
                const pElement = document.createElement("p");
                pElement.classList.add("active");
                pElement.textContent = element;
                lyricsList.insertBefore(pElement, lyricsList.lastElementChild);
            }
            lyrcisType = 1;
            break;
        }
        case "synced": {
            loadElement.remove();
            for (const element of lyrics) {
                const pElement = document.createElement("p");
                pElement.textContent = element.text;
                pElement.onclick = () => window.electronAPI.seekTo(element.start_ms / 1000);
                lyricsList.insertBefore(pElement, lyricsList.lastElementChild);
            }
            lyricsGlobal = lyrics;
            lyrcisType = 2;
            break;
        }
    }
}
function updateLyrics(curTime) {
    if (!lyricsGlobal || lyrcisType != 2) return;
    const pElements = document.querySelectorAll(".musicbar .lyrics-list p");
    let lastTemp = null;
    for (const [index, element] of lyricsGlobal.entries()) {
        if (element.start_ms <= curTime) {
            pElements[index].classList.add("active");
            lastTemp = index;
        } else pElements[index].classList.remove("active");
    }
    if (lastLyr != lastTemp && lastTemp) pElements[lastTemp].scrollIntoView({ block: "center", behavior: "smooth" });
    lastLyr = lastTemp;
}

class SongQueue {
    #song;
    constructor (name, author, index, imgHref, duration, id) {
        this.name = name;
        this.author = author;
        this.index = index;
        this.imgHref = imgHref;
        this.duration = duration;
        this.id = id;

        const clone = songQueueTemplate.content.cloneNode(true);
        this.#song = clone.querySelector(".song");
        this.#song.querySelector("h1").textContent = this.name;
        this.#song.querySelector("h2").textContent = this.author;
        this.#song.querySelector(".song-img").src = this.imgHref;
        this.#song.querySelector(".duration").textContent = this.duration;
        this.#song.onclick = () => this.goTo();
        queueList.appendChild(this.#song);
    }

    clearPlaying() {
        this.#song.classList.remove("playing");
    }

    makePlaying() {
        this.#song.classList.add("playing");
    }
    
    goTo() {
        const goIndex = this.index - nowPlaying;
        if (goIndex != 0) window.electronAPI.goTo(goIndex);
    }

    scrollToThis() {
        this.#song.scrollIntoView({ block: "center", behavior: "smooth" })
    }

    setIndex(index) {
        this.index = index;
    }
}