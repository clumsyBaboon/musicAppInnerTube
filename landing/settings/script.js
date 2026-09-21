document.querySelector("#close").addEventListener("click", () => {
    const data = {
        "autoCookie": document.querySelector("#autoCookie").checked,
        "cachedSongs": document.querySelector("#cached-songs").value
    }
    window.electronAPI.closeSettings(data);
})

window.electronAPI.onConfig(data => {
    console.log(data)
    document.querySelector("#autoCookie").checked = data.autoCookie;
    document.querySelector("#cached-songs").value = data.cachedSongs;
})