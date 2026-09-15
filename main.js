// Библиотеки
const { ipcMain, dialog } = require('electron');
const { app, BrowserWindow, screen } = require('electron/main');
const fs = require("fs");
const path = require("path");
const pkg = require("./package.json");
const VERSION = pkg.version;
const appId = "clumsybaboon-musicappinnertube";
const { Innertube, YTNodes } = require("youtubei.js");
const { title } = require('process');
const { type } = require('os');

let COOKIE;

let youtube;

let workArea;

let config = {
    autoCookie: false
}

let libraryGlobal = [];

// Функция вывода отладки в консоль
function print(data, state) {
    switch (state) { // Выбор режима
        case "log": // Обычный лог
        case undefined:
            console.log(`[${__filename}] [${VERSION}]`, data);
            break;
        case "err": // Ошибка
            console.error(`[${__filename}] [${VERSION}]`, data);
            dialog.showErrorBox("Error", data); // Вывод диалог окна с ошибкой
            break;
    }
}

function write(data) {
    fs.writeFileSync(path.join(__dirname, "test.json"), JSON.stringify(data, null, 2), "utf-8");
}

let win; // Основное окно

let settingsWin; // Окно настроек

// Создание окна
function createWindow () {
    win = new BrowserWindow({
        width: 300, //1000x650
        height: 158,
        resizable: false,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 10, y: 10 },
        // icon: path.join(__dirname, "icon.ico"),
        useContentSize: true,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
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
        if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        }
    }) 
})

app.on('window-all-closed', () => {
    app.quit();
})

async function connectToYoutube() {
    win.webContents.send("change-login-to-loading");
    try{
        youtube = await Innertube.create({
            cookie: COOKIE
        })

        if (youtube.session.logged_in) {
            print("Autorized successfully");
            await loadLibrary();
            win.close();
            win = new BrowserWindow({
                width: 1200,
                height: 700,
                minWidth: 1000,
                minHeight: 650,
                resizable: true,
                titleBarStyle: 'hidden',
                trafficLightPosition: { x: 20, y: 20 },
                // icon: path.join(__dirname, "icon.ico"),
                useContentSize: true,
                show: false,
                webPreferences: {
                    preload: path.join(__dirname, "preload.js")
                }
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

// ===== ФУНКЦИИ ИЗ ELECTRON =====

// Спросить у пользователя где токен файл
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
        }
    } catch (err) {
        print(`Func use-saved-cookie-file. ${err.message}`, "err");
        return;
    }
    connectToYoutube();
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
        width: 350,
        height: 105,
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
    config = data;
    try {
        const configFilePath = path.join(app.getPath("userData"), "config.json");
        fs.writeFileSync(configFilePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
        print(`Error in writing config file: ${err.message}`, "err");
    }
    settingsWin.hide();
})

ipcMain.on("require-playlist-wrapper", () => win.webContents.send("playlist-wrapper", libraryGlobal))

// // Ф-ция перевода MM:SS.MS в секунды
// function strToNumLyr(str) {
//     const posDots = str.indexOf(':'); // Нахождения позиции [:]
//     const posDot = str.indexOf('.'); // Нахождение позиции [.]
//     const min = Number(str.slice(0, posDots));
//     const sec = Number(str.slice(posDots + 1, posDot));
//     const ms = Number(str.slice(posDot + 1));
//     return min * 60000 + sec * 1000 + ms; // Возвращаю результат
// }

// // Запрос на текст песни
// ipcMain.on("require-lyrics", async (event, data) => {
//     print("Require lyrics"); // Вывод в консоль
//     const url = "https://lrclib.net/api/get"; // Адрес запроса
//     // Если сейчас ничего не играет -> досрочно выхожу из ф-ции
//     if (data[0].length == 0 || data[1].length == 0 || data[2] == 0) {
//         print("Require lyrics err. Nothing is playing");
//         return;
//     }
//     // Параметры для GET запроса
//     const data_send = new URLSearchParams({
//         track_name: data[0], // Название трека
//         artist_name: data[1], // Название исполнителя
//         duration: data[2] // Длина трека
//     })
//     try {
//         const response = await fetch(`${url}?${data_send}`); // Формирую запроса
//         if (!response.ok) { // Если ошибка
//             const errText = await response.text(); // Текст ошибки
//             throw new Error(`Status: ${response.status} - ${errText}`);
//         }
//         const responseJson = await response.json(); // Результат в json-е
//         let res; // Переменная для будущих слов
//         let type; // Тип будущих слов 
//         if (responseJson.syncedLyrics == null) { // Если в результате нет переменной с синхронизированными словами, то использовать обычные !добавить выбор!
//             res = responseJson.plainLyrics.split('\n').map(element => ["plain", element]);
//                         // Переменую делю по \n и меняю каждый елемент. Пример:
//                         // ["Текст1 \n Текст2 \n Текст3"] -> [["plain", "Текст1"], ["plain", "Текст2"], ["plain", "Текст3"]]
//             type = "plain"; // Задаю тип
//         } else { // Синхронизированные слова построчно
//             res = responseJson.syncedLyrics.split('\n').map(element => { // Переменую делю по \n и меняю каждый елемент
//                 // Данные из syncedLyrics: "[00:17.12] I feel your breath upon my neck\n ... [MM:SS:MS] text"
//                 const posOpen = element.indexOf("[") + 1; // Первая цифра находится по этому индексу (позиция скобки + 1)
//                 const posClose = element.indexOf("]"); // Правая скобка находится по этому индексу
//                 // Метод slice вырезает включительно с первым аргументом, но не включительно со вторым
//                 const time = strToNumLyr(element.slice(posOpen, posClose)); // Передаю ф-ции которая вернет результат в миллисекундах
//                 const lyr = element.slice(posClose + 2); // Первая буква слов начинается Позиция ] + 2
//                                                          // Между словами и правой скобкой всегда стоит пробел
//                 return [time, lyr]; // Результат записываеся таким образом
//             });
//             type = "syn"; // Задаю тип
//         }
//         // Отправляю результат в electron
//         win.webContents.send("lyrics-update", {
//             lyr: res,
//             type: type
//         });
//         print("Lyrics were send to renderer"); // Вывожу результат в консоль
//     } catch (err) { // Если ошибка
//         print(`Error in fetch: ${err}`); // Вывод в консоль
//     }
// })