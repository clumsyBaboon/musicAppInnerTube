const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    // Login
    selectCookieFile: () => ipcRenderer.send("select-cookie-file"),
    useSavedCookieFile: () => ipcRenderer.send("use-saved-cookie-file"),

    onChangeLoginToLoading: callback => ipcRenderer.on("change-login-to-loading", () => callback()),

    // Library
    requirePlaylistWrapper: () => ipcRenderer.send("require-playlist-wrapper"),
    onPlaylistWrapper: callback => ipcRenderer.on("playlist-wrapper", (event, data) => callback(data)),

    loadSongs: data => ipcRenderer.invoke("load-songs", data),
    startSong: data => ipcRenderer.send("start-song", data),

    // Account ingo
    signOut: () => ipcRenderer.send("sign-out"),
    openSettings: () => ipcRenderer.send("open-settings"),

    onAccountInfo: callback => ipcRenderer.on("account-info", (event, data) => callback(data)),

    // Settings
    closeSettings: data => ipcRenderer.send("close-settings", data),

    onConfig: callback => ipcRenderer.on("config", (event, data) => callback(data)),

    // State
    playPause: () => ipcRenderer.send("play-pause"),
    next: () => ipcRenderer.send("next"),
    prev: () => ipcRenderer.send("prev"),
    setVolume: data => ipcRenderer.send("set-volume", data),
    requireVolume: () => ipcRenderer.invoke("require-volume"),
    seekTo: data => ipcRenderer.send("seek-to", data),
    requireQueue: () => ipcRenderer.invoke("require-queue"),
    goTo: data => ipcRenderer.send("go-to", data),
    newQueue: data => ipcRenderer.send("new-queue", data),
    playNext: data => ipcRenderer.send("play-next", data),
    addToQueue: data => ipcRenderer.send("add-to-queue", data),
    requireLyrics: data => ipcRenderer.invoke("require-lyrics", data),

    onStateUpdate: callback => ipcRenderer.on("state-update", (event, data) => callback(data)),
    onNewQueue: callback => ipcRenderer.on("new-queue", (event, data) => callback(data)),
})