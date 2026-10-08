// Библиотеки
const { ipcMain, dialog } = require('electron');
const { app, BrowserWindow, screen, Tray, nativeImage, Menu } = require('electron/main');
const fs = require("fs");
const path = require("path");
const pkg = require("./package.json");
const VERSION = pkg.version;
const appId = "clumsybaboon-musicappinnertube";
const { Innertube, YTNodes, Platform, Parser } = require("youtubei.js");
const yaml = require("yaml");
const { title } = require('process');
const { type } = require('os');
const { resolve } = require('dns');
const { rejects } = require('assert');

let COOKIE;

let youtube;

let workArea;

let config = {
    autoCookie: false,
    cachedSongs: "medium",
    typeLyrics: "synced",
    volume: 100,
    isVolumeOn: true
}

let libraryGlobal = [];

let queue = [];
let nowPlaying = 0;
let currentTime = 0;
let waitForNext = false;

let isQuit = false;

// Функция вывода отладки в консоль
function print(data, state) {
    if (app.isPackaged) return;
    switch (state) { // Выбор режима
        case "log": // Обычный лог
        case undefined:
            console.log(`[${path.basename(__filename)}] [${VERSION}]`, data);
            break;
        case "err": // Ошибка
            console.error(`[${path.basename(__filename)}] [${VERSION}]`, data);
            dialog.showErrorBox("Error", data); // Вывод диалог окна с ошибкой
            break;
    }
}

function write(data) {
    fs.writeFileSync(path.join(__dirname, "test1.json"), JSON.stringify(data, null, 2), "utf-8");
}

let win; // Основное окно

let soundWin;

let tray;

let settingsWin; // Окно настроек

// Создание окна
function createWindow () {
    win = new BrowserWindow({
        width: 300, //1000x650
        height: 158,
        resizable: false,
        titleBarStyle: process.platform == "darwin" ? "hidden" : "default",
        trafficLightPosition: { x: 10, y: 10 },
        // icon: path.join(__dirname, "icon.ico"),
        useContentSize: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    })

    win.on("close", event => {
        app.quit();
    })

    win.setMenuBarVisibility(false);
    win.loadFile('./landing/login/index.html')
    // win.webContents.openDevTools();

    win.once("ready-to-show", () => win.show());
}

// При старте программы
app.whenReady().then(() => {
    workArea = screen.getPrimaryDisplay().workArea;
    createWindow(); // Создание окна
    win.webContents.on("did-finish-load", () => {
        if (config.autoCookie) {useSavedCookieFile()}
    })
    loadConfig();

    // Если окно не создалось, попытка создать еще раз
    app.on('activate', () => {
        if (!win.isVisible()) {
            win.show();
            win.focus();
        }
    })

    // tray
    let icon = nativeImage.createFromPath(path.join(__dirname, "landing/img/icon-tray.png"));
    icon = icon.resize({ width: 22, height: 22 });
    icon.setTemplateImage(false);
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Show",
            click: () => {
                if (!win.isVisible()) win.show();
                win.focus();
            }
        },
        {
            label: "Exit",
            click: () => {
                isQuit = true;
                if (win) win.close();
                app.quit();
            }
        }
    ])
    tray.setContextMenu(contextMenu);
})

app.on("window-all-closed", event => event.preventDefault());

app.on("before-quit", () => {
    isQuit = true;
})
app.on("quit", () => {
    saveConfig();
})

function createSoundWin() {
    if (soundWin) soundWin.destroy();
    soundWin = new BrowserWindow({
        width: 500,
        height: 500,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            backgroundThrottling: false,
            preload: path.join(__dirname, "soundPreload.js")
        }
    })
    soundWin.loadFile(path.join(__dirname, "landing/playSound/index.html"));
    soundWin.webContents.openDevTools();
}

async function connectToYoutube() {
    win.webContents.send("change-login-to-loading");
    try{
        Platform.shim.eval = async data => new Function(data.output)();
        Parser.setParserErrorHandler(error => console.warn(`[ERROR IN PARSER] ${error.message}`));
        youtube = await Innertube.create({
            cookie: COOKIE
        })

        if (youtube.session.logged_in) {
            print("Autorized successfully");
            await loadLibrary();
            win.destroy();
            win = null;
            win = new BrowserWindow({
                width: 1200,
                height: 700,
                minWidth: 1100,
                minHeight: 650,
                resizable: true,
                titleBarStyle: process.platform == "darwin" ? "hidden" : "default",
                trafficLightPosition: { x: 20, y: 20 },
                // icon: path.join(__dirname, "icon.ico"),
                useContentSize: true,
                show: false,
                webPreferences: {
                    preload: path.join(__dirname, "preload.js")
                }
            })
            win.on("close", event => {
                if (isQuit) {
                    return;
                }
                saveConfig();
                event.preventDefault();
                win.hide();
            })
            win.setMenuBarVisibility(false);
            win.loadFile(path.join(__dirname, "landing/library/index.html"))
            // win.webContents.openDevTools();
            win.once("ready-to-show", async () => {
                win.show();
                const accountInfo = await youtube.account.getInfo();
                const accountImageHref = accountInfo.contents.contents[0].account_photo[0].url;
                const accountName = accountInfo.contents.contents[0].account_name.text;
                win.webContents.send("account-info", { img: accountImageHref, name: accountName });
            })
            createSoundWin();
        }
    } catch (err) {
        print(`Func connectToYoutube. ${err}`, "err");
        win.reload();
    }
}

function loadConfig() {
    try {
        const configFilePath = path.join(app.getPath("userData"), "config.json");
        if (fs.existsSync(configFilePath)) {
            const file = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
            config = file;
        } else {
            print("Config file doesn't exists");
        }
    } catch (err) {
        print(`Error in reading config file: ${err.message}`, "err");
    }
}

async function loadLibrary() {
    const library = await youtube.music.getLibrary();
    const playlists = library.contents.get({ type: "Grid" }).items.filterType(YTNodes.MusicTwoRowItem);
    for (const element of playlists) {
        libraryGlobal.push({
            name: element.title.text,
            subtitle: element.subtitle.text,
            id: element.id.startsWith("VL") ? element.id.slice(2) : element.id,
            imgHref: element.thumbnail[0].url,
            type: element.item_type
        });
    }
}

async function startSong(id) {
    const trackInfo = await youtube.music.getInfo(id);
    const filePath = path.join(app.getPath("userData"), `temp/${id}.webm`);
    let response = {
        title: trackInfo.basic_info.title,
        author: trackInfo.basic_info.author,
        imgHref: trackInfo.basic_info.thumbnail?.[0]?.url
    }
    fs.mkdirSync(path.join(app.getPath("userData"), "temp"), { recursive: true });

    // check amount of cached songs
    let keepFilesAmount;
    switch (config.cachedSongs) {
        case "compact": keepFilesAmount = 15; break;
        case "medium": keepFilesAmount = 50; break;
        case "extended": keepFilesAmount = 100; break;
        default: keepFilesAmount = 15; break;
    }
    const tempFolder = path.join(app.getPath("userData"), "temp");
    const files = fs.readdirSync(tempFolder);
    if (files.length > keepFilesAmount) {
        for (const file of files) if (file != `${id}.webm`) fs.rmSync(path.join(tempFolder, file));
    }

    if (!fs.existsSync(filePath)) {
        const stream = await trackInfo.download({
            type: "audio",
            format: "webm",
            quality: "best"
        })
        const writeStream = fs.createWriteStream(filePath);
        for await (const chunk of stream) writeStream.write(chunk);
        writeStream.end();
        
        response.filePath = await new Promise(resolve => {
            writeStream.on("finish", () => {
                print("Finish downloading")
                resolve(filePath)
            })
            writeStream.on("error", err => {
                print(`Error in downloading song: ${err}`, "err");
                resolve(null);
            })
        })
    } else {
        response.filePath = filePath;
    }
    
    soundWin.webContents.send("start-song", response);
}

function saveConfig() {
    try {
        const configFilePath = path.join(app.getPath("userData"), "config.json");
        fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2), "utf-8");
    } catch (err) {
        print(`Error in writing config file: ${err.message}`, "err");
    }
}

function secToMin(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = Math.floor(sec) % 60;
    const paddedSeconds = String(seconds).padStart(2, "0");
    return `${minutes}:${paddedSeconds}`;
}

function playNext(data) {
    if (queue) {
        queue.splice(nowPlaying + 1, 0, data);
        win.webContents.send("new-queue", ({queue, nowPlaying}));
    }
}

function addToQueue(data) {
    if (queue) {
        queue.splice(queue.length, 0, data);
        win.webContents.send("new-queue", ({queue, nowPlaying}));
    }
}

// ===== ФУНКЦИИ ИЗ ELECTRON =====
ipcMain.handle("require-search", async (event, data) => {
    const search = await youtube.music.search(data);
    const contentsLoaded = search.contents;
    let content = [];
    for (const element of contentsLoaded) {
        if (element.type == "MusicCardShelf" && element.subtitle?.runs?.[0]?.text == "Song") {
            content.push({
                type: "main_song",
                title: element.title.text,
                subtitle: element.subtitle.text,
                id: element.title.runs?.[0]?.endpoint.payload.videoId,
                imgHref: element.thumbnail?.contents?.[0]?.url
            })
        } else if (element.type == "MusicCardShelf" && element.subtitle?.runs?.[0]?.text == "Artist") {
            content.push({
                type: "main_artist",
                title: element.title.text,
                subtitle: element.subtitle.text,
                id: element.title.runs?.[0]?.endpoint.payload.browseId,
                imgHref: element.thumbnail?.contents?.[0]?.url
            })
        } else if (element.type == "ItemSection" &&
                   element.contents?.[0]?.type == "MusicResponsiveListItem" &&
                   element.contents?.[0].item_type == "song") {
            let author = element.contents[0].artists?.[0]?.name ?? "Unknown";
            if (element.contents[0].artists?.length > 1) author += " and more";
            content.push({
                type: "regular_song",
                title: element.contents[0].title ?? "Unknown",
                author,
                id: element.contents[0].id,
                imgHref: element.contents[0].thumbnail.contents?.[0].url
            })
        } else if (element.type == "ItemSection" &&
                   element.contents?.[0]?.type == "MusicResponsiveListItem" &&
                   element.contents?.[0].item_type == "artist") {
            content.push({
                type: "regular_artist",
                title: element.contents[0].name,
                subtitle: element.contents[0].subtitle.text,
                id: element.contents[0].id,
                imgHref: element.contents[0].thumbnail.contents?.[0]?.url
            })
        }
    }
    return content;
})

ipcMain.handle("require-lyrics", async (event, data) => {
    print("Require new lyrics");
    switch (config.typeLyrics) {
        case "plain": var typeOfLyrics = 0; break;
        case "syncsed": var typeOfLyrics = 1; break;
        case "wordSynced": var typeOfLyrics = 2; break;
        default: var typeOfLyrics = 1; break; 
    }
    const url = "https://lrclib.net/api/get";
    const dataSend = new URLSearchParams({
        track_name: data.title,
        artist_name: data.author,
        duration: data.duration
    })
    try {
        const response = await fetch(`${url}?${dataSend}`);
        if (!response.ok) {
            const errText = await response.text();
            console.log(`err: ${errText}, code: ${response.status}`);
            return ["error", response.status];
        }
        const responseJson = await response.json();
        const responseYaml = yaml.parse(responseJson.lyricsfile);
        if (typeOfLyrics >= 2 && responseJson.hasWordSync) {
            return ["error", "Working on this type. Select Plain or Synced lyrics in setting instead"];
        }
        if (typeOfLyrics >= 1 && responseYaml.lines?.length != 0) {
            let sendLyr = [];
            for (const element of responseYaml.lines) {
                sendLyr.push(element);
            }
            return ["synced", sendLyr];
        }
        if (typeOfLyrics >= 0 && responseYaml.plain?.length != 0) {
            const words = responseYaml.plain.split('\n');
            return ["plain", words];
        }
        return ["no_lyr", null];

    } catch (err) {
        print(`Error in loading lyrics: ${err.message}`, "err");
    }
    return [data.title, null];
})

ipcMain.on("play-next", (event, data) => playNext(data));
ipcMain.on("add-to-queue", (event, data) => addToQueue(data));

ipcMain.on("play-next-id-only", async (event, data) => {
    const id = data;
    const songInfo = await youtube.music.getInfo(id);
    const dataSend = {
        name: songInfo.basic_info.title,
        author: songInfo.basic_info.author,
        imgHref: songInfo.basic_info.thumbnail[0].url,
        duration: secToMin(songInfo.basic_info.duration),
        id: songInfo.basic_info.id
    }
    playNext(dataSend);
})
ipcMain.on("add-to-queue-id-only", async (event, data) => {
    const id = data;
    const songInfo = await youtube.music.getInfo(id);
    const dataSend = {
        name: songInfo.basic_info.title,
        author: songInfo.basic_info.author,
        imgHref: songInfo.basic_info.thumbnail[0].url,
        duration: secToMin(songInfo.basic_info.duration),
        id: songInfo.basic_info.id
    }
    addToQueue(dataSend);
})

ipcMain.on("new-queue", (event, data) => {
    queue = data.newQueue;
    nowPlaying = data.nowPlaying;
})

ipcMain.on("go-to", (event, data) => {
    if (nowPlaying + data >= 0 && nowPlaying + data < queue.length) {
        nowPlaying += data;
        startSong(queue[nowPlaying].id).catch(err => print(`Error in reading/writing temp folder: ${err}`));
    }
})

ipcMain.handle("require-queue", () => ({queue, nowPlaying}) );

ipcMain.on("seek-to", (event, data) => {
    soundWin.webContents.send("seek-to", data);
})

ipcMain.handle("require-volume", () => {
    const data = {
        isVolumeOn: config.isVolumeOn,
        value: config.volume
    }
    if (soundWin) soundWin.webContents.send("set-volume", data);
    return data;
})

ipcMain.on("set-volume", (event, data) => {
    config.volume = data.value;
    config.isVolumeOn = data.isVolumeOn;
    if (soundWin) soundWin.webContents.send("set-volume", data);
})

ipcMain.on("ended", () => {
    print("Song ended");
    if (nowPlaying < queue.length - 1) {
        nowPlaying++;
        startSong(queue[nowPlaying].id);
    }
})

ipcMain.on("play-pause", () => soundWin.webContents.send("play-pause"));
ipcMain.on("next", async () => {
    if (nowPlaying < queue.length - 1 && !waitForNext) {
        waitForNext = true;
        nowPlaying++;
        await startSong(queue[nowPlaying].id);
        waitForNext = false;
    }
});
ipcMain.on("prev", async () => {
    if (nowPlaying > 0 && !waitForNext) {
        if (currentTime > 10) {
            soundWin.webContents.send("seek-to", 0);
        } else {
            waitForNext = true;
            nowPlaying--;
            await startSong(queue[nowPlaying].id);
            waitForNext = false;
        }
    }
});

ipcMain.on("state-update", (event, data) => {
    data.prevBtnDisabled = waitForNext ? true : ((nowPlaying > 0) ? false : true);
    data.nextBtnDisabled = waitForNext ? true : ((nowPlaying < queue.length - 1) ? false : true);
    data.nowPlaying = nowPlaying;
    currentTime = Math.floor(data.currentTime);
    if (!win.isDestroyed()) win.webContents.send("state-update", data);
})

ipcMain.on("start-song", (event, data) => {
    const id = data.id;
    print(`Starting song playing... ID: ${id}`);
    queue = data.queue;
    nowPlaying = data.index;

    startSong(id).catch(err => print(`Error in reading/writing temp folder: ${err}`));
})

ipcMain.on("start-song-id-only", async (event, data) => {
    const id = data;
    print(`Starting song playing... ID: ${id}`);
    const songInfo = await youtube.music.getInfo(id);
    queue = [{
        name: songInfo.basic_info.title,
        author: songInfo.basic_info.author,
        imgHref: songInfo.basic_info.thumbnail[0].url,
        duration: secToMin(songInfo.basic_info.duration),
        id: songInfo.basic_info.id
    }]
    nowPlaying = 0;

    startSong(id).catch(err => print(`Error in reading/writing temp folder: ${err}`));
})

ipcMain.on("select-cookie-file", async () => {
    const { cancelled, filePaths } = await dialog.showOpenDialog({
        title: "Select cookie file",
        properties: ["openFile"],
        filters: [
            { name: "Text files", extensions: ["txt"] }
        ]
    })
    if (filePaths.length != 0) {
        try {
            const cookie = fs.readFileSync(filePaths[0], "utf-8");
            COOKIE = cookie;
        } catch (err) {
            print(`Func select-cookie-file. ${err.message}`, "err");
            return;
        }
    }
    if (cancelled || filePaths.length == 0) {
        print("You closed dialog window", "err");
        return;
    }
    const { response } = await dialog.showMessageBox({
        type: "question",
        buttons: ["No", "Yes"],
        defaultId: 1,
        cancelId: 0,
        title: "Save cookie",
        message: "Do you want this cookie file in memory?"
    })
    if (response === 1) {
        try {
            print("Saving cookie file...");
            fs.writeFileSync(path.join(app.getPath("userData"), "cookie.json"), JSON.stringify(COOKIE, null, 2), "utf-8");
            print("Cookie file successfully saved");
        } catch (err) {
            print(`Error in saving cookie file ${err.message}`, "err");
            return;
        }
    }
    connectToYoutube();
})

ipcMain.on("use-saved-cookie-file", useSavedCookieFile)

function useSavedCookieFile() {
    try {
        const existsFile = fs.existsSync(path.join(app.getPath("userData"), "cookie.json"));
        if (!existsFile) {
            print("Cookie file doesn't exists", "err");
        } else {
            const response = JSON.parse(fs.readFileSync(path.join(app.getPath("userData"), "cookie.json"), "utf-8"));
            COOKIE = response;
            connectToYoutube();
        }
    } catch (err) {
        print(`Func use-saved-cookie-file. ${err.message}`, "err");
        return;
    }
}

ipcMain.on("sign-out", async () => {
    const { response } = await dialog.showMessageBox({
        type: "question",
        buttons: ["No", "Yes"],
        defaultId: 1,
        cancelId: 0,
        title: "Sign out?",
        message: "Do you really want to sign out?"
    })
    if (response == 1) {
        COOKIE = null;
        youtube = null;
        win.close();
        createWindow();
    }
})

ipcMain.on("open-settings", () => {
    settingsWin = new BrowserWindow({
        width: 400,
        height: 165,
        resizable: false,
        trafficLightPosition: { x: 10, y: 10 },
        // icon: path.join(__dirname, "icon.ico"),
        useContentSize: true,
        show: false,
        modal: true,
        parent: win,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    })

    settingsWin.setMenuBarVisibility(false);
    settingsWin.loadFile('./landing/settings/index.html')
    // settingsWin.webContents.openDevTools();

    settingsWin.once("ready-to-show", () => settingsWin.show());
    settingsWin.webContents.on("did-finish-load", () => settingsWin.webContents.send("config", config))

    settingsWin.on("hide", () => settingsWin.close());
})

ipcMain.on("close-settings", (event, data) => {
    for (const [key, value] of Object.entries(data)) config[key] = value;
    saveConfig();
    settingsWin.hide();
})

ipcMain.on("require-playlist-wrapper", () => win.webContents.send("playlist-wrapper", libraryGlobal))

ipcMain.handle("load-songs", async (event, data) => {
    if (data.type == "playlist") {
        print(`Load songs of playlist: ${data.id}`);
        let playlist = await youtube.music.getPlaylist(data.id);
        const subtitle = playlist?.header?.subtitle?.text ?? "";
        const subtitle2 = playlist?.header?.second_subtitle?.text ?? "";
        const allSongs = [];
        while (true) {
            print("Load");
            const songs = playlist.contents.filterType(YTNodes.MusicResponsiveListItem);
            for (const element of songs) {
                // search author
                let author = element.artists?.[0]?.name ?? "Unknown";
                if (element.artists?.length > 1) author += " and more";
                // search duration
                let duration = element.duration?.text;
                if (!duration) duration = element.flex_columns?.[2]?.title?.text ?? " ";
                allSongs.push({
                    name: element.title,
                    author,
                    imgHref: element.thumbnail.contents.at(-1).url,
                    duration,
                    id: element.id
                })
            }
            if (!playlist.has_continuation) break;
            else playlist = await playlist.getContinuation();
        }
        print(`Has loaded ${allSongs.length} songs`);
        // console.log(allSongs);
        
        return {data: allSongs, subtitle, subtitle2};
    } else if (data.type == "artist") {
        print(`Load songs of artist: ${data.id}`);
        const artist = await youtube.music.getArtist(data.id);
        const songs = await artist.getAllSongs();
        let subtitle = "";
        for (const element of libraryGlobal) {
            if (element.id == data.id) {
                subtitle = element.subtitle;
                break;
            }
        }
        const allSongs = [];
        for (const element of songs.contents.filterType(YTNodes.MusicResponsiveListItem)) {
            let author = element.artists?.[0]?.name ?? "Unknown";
            if (element.artists?.length > 1) author += " and more";
            allSongs.push({
                name: element.title,
                author,
                imgHref: element.thumbnail.contents?.at(-1).url,
                duration: element.duration.text,
                id: element.id
            })
        }
        return {data: allSongs, subtitle, subtitle2: ""};
    } else if (data.type == "album") {
        print(`Load songs of album: ${data.id}`);
        const album = await youtube.music.getAlbum(data.id);
        const subtitle = album?.header?.subtitle?.text ?? "";
        const subtitle2 = album?.header?.second_subtitle?.text ?? "";
        const author = album?.header?.strapline_text_one?.text ?? "";
        const thumbnail = album.header.thumbnail.contents?.at(-1).url;
        const allSongs = [];
        for (const element of album.contents.filterType(YTNodes.MusicResponsiveListItem)) {
            allSongs.push({
                name: element.title,
                author,
                imgHref: thumbnail,
                duration: element.duration.text,
                id: element.id
            })
        }
        return {data: allSongs, subtitle, subtitle2};
    }
    return false;
})

ipcMain.on("require-account-info", async () => {
    if (youtube.session.logged_in) {
        const accountInfo = await youtube.account.getInfo();
        const accountImageHref = accountInfo.contents.contents[0].account_photo[0].url;
        const accountName = accountInfo.contents.contents[0].account_name.text;
        win.webContents.send("account-info", { img: accountImageHref, name: accountName });
    }
})