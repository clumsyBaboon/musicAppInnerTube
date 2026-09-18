const audio = document.querySelector("#audio");

let title;
let artist;
let imgHref;

let isNowPlaying = false;
let isActive = false;

let stateInterval;

let lastCurrentTime = 0;
let lastDuration = 0;

function sendState() {
    const data = {
        currentTime: lastCurrentTime,
        duration: lastDuration,
        title,
        artist,
        imgHref,
        isNowPlaying
    }
    window.electronAPI.sendState(data);
}

window.electronAPI.onStartSong(data => {
    console.log(data);
    const audioPath = `file://${data.filePath}`;
    isNowPlaying = true;
    isActive = true;
    title = data.title;
    artist = data.author;
    imgHref = data.imgHref;
    stateInterval = setInterval(() => {
        if (!isActive) {
            clearInterval(stateInterval);
            stateInterval = null;
        }
        sendState();
    }, 2000)

    audio.src = audioPath;
    audio.load();

    if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: data.title,
            artist: data.author,
            artwork: [{ src: data.imgHref }]
        })
    }

    audio.play().catch(err => console.error(err));
})

window.electronAPI.onPlayPause(() => {
    if (!isActive) return
    if (isNowPlaying) audio.pause();
    else audio.play();
    isNowPlaying = !isNowPlaying;
    sendState();
})

if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("pause", () => {
        isNowPlaying = false;
        audio.pause()
        console.log("pause");
    })
    navigator.mediaSession.setActionHandler("play", () => {
        isNowPlaying = true;
        audio.play()
        console.log("play");
    })
    navigator.mediaSession.setActionHandler("previoustrack", () => {
        console.log("prev");
    })
    navigator.mediaSession.setActionHandler("nexttrack", () => {
        console.log("next");
    })
}

audio.addEventListener("timeupdate", () => {
    if (!isActive) return;
    lastCurrentTime = audio.currentTime;
    lastDuration = audio.duration;
    sendState();
})