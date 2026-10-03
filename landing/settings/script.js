document.querySelector("#close").addEventListener("click", () => {
    const data = {
        "autoCookie": document.querySelector("#autoCookie").checked,
        "cachedSongs": document.querySelector("#cached-songs").value,
        "typeLyrics": document.querySelector("#type-of-lyrics").value
    }
    window.electronAPI.closeSettings(data);
})

window.electronAPI.onConfig(data => {
    document.querySelector("#autoCookie").checked = data.autoCookie;
    document.querySelector("#cached-songs").value = data.cachedSongs;
    document.querySelector("#type-of-lyrics").value = data.typeLyrics;
})