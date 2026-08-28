const { app, BrowserWindow } = require('electron/main');
const path = require("path");

let win;
const createWindow = () => {
    win = new BrowserWindow({
    width: 1000,
    height: 650,
    minWidth: 1000,
    minHeight: 650,
    useContentSize: true,
    webPreferences: {
        preload: path.join(__dirname, "preload.js")
    }
    })

    win.setMenuBarVisibility(false);
    win.loadFile(path.join(__dirname, "landing/index.html"));
    // win.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
    })
})

app.on('window-all-closed', () => {
    app.quit();
})
