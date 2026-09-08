document.querySelector("#close").addEventListener("click", () => {
    const data = {
        "autoCookie": document.querySelector("#autoCookie").checked
    }
    window.electronAPI.closeSettings(data);
})

window.electronAPI.onConfig(data => {
    document.querySelector("#autoCookie").checked = data.autoCookie;
})