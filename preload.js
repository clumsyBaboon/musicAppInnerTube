const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    // Login
    selectCookieFile: () => ipcRenderer.send("select-cookie-file"),
    useSavedCookieFile: () => ipcRenderer.send("use-saved-cookie-file"),

    onChangeLoginToLoading: callback => ipcRenderer.on("change-login-to-loading", event => callback())
})