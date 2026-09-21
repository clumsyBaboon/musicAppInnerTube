const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    onStartSong: callback => ipcRenderer.on("start-song", (event, data) => callback(data)),
    onPlayPause: callback => ipcRenderer.on("play-pause", () => callback()),

    sendState: data => ipcRenderer.send("state-update", data),
    ended: () => ipcRenderer.send("ended"),
    next: () => ipcRenderer.send("next"),
    prev: () => ipcRenderer.send("prev")
})