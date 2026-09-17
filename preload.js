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

    // Account ingo
    signOut: () => ipcRenderer.send("sign-out"),
    openSettings: () => ipcRenderer.send("open-settings"),

    onAccountInfo: callback => ipcRenderer.on("account-info", (event, data) => callback(data)),

    // Settings
    closeSettings: data => ipcRenderer.send("close-settings", data),

    onConfig: callback => ipcRenderer.on("config", (event, data) => callback(data))
})