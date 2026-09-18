const btnPrev = document.querySelector(".musicbar .btn-prev");
const btnNext = document.querySelector(".musicbar .btn-next");
const btnPlayPause = document.querySelector(".musicbar .btn-play-pause");
const albumImg = document.querySelector(".musicbar .album");
const title = document.querySelector(".musicbar h1");
const author = document.querySelector(".musicbar h2");

window.electronAPI.onStateUpdate(data => {
    if (btnPlayPause.disabled) {
        btnPlayPause.disabled = false;
        document.documentElement.style.setProperty("--opacity-music-bar", "1");
    }
    btnPrev.disabled = data.prevBtnDisabled ? true : false;
    btnNext.disabled = data.nextBtnDisabled ? true : false;
    btnPlayPause.style.backgroundImage = data.isNowPlaying ? "url(../img/pause.svg)" : "url(../img/play.svg)";
    albumImg.src = data.imgHref;
    title.textContent = data.title;
    author.textContent = data.artist;
})

btnPlayPause.addEventListener("click", () => window.electronAPI.playPause());