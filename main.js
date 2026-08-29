// Библиотеки
const { ipcMain, dialog } = require('electron');
const { app, BrowserWindow, screen } = require('electron/main');
const fs = require("fs");
const path = require("path");
const pkg = require("./package.json");
const VERSION = pkg.version;
const appId = "clumsybaboon-musicappinnertube";
const { Innertube } = require("youtubei.js");

let COOKIE;

let youtube;

let workArea;

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

let win; // Основное окно

// Создание окна
const createWindow = () => {
    console.log(workArea.width);
    win = new BrowserWindow({
        width: 300, //1000x650
        height: 158,
        x: (workArea.width - 300) / 2,
        y: (workArea.height - 158) / 2,
        resizable: false,
        // icon: path.join(__dirname, "icon.ico"),
        useContentSize: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js")
        }
    })

    win.setMenuBarVisibility(false);
    win.loadFile('./landing/login/index.html')
//   win.webContents.openDevTools();
}

// При старте программы
app.whenReady().then(() => {
    workArea = screen.getPrimaryDisplay().workArea;
    createWindow(); // Создание окна

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
            win.loadFile(path.join(__dirname, "landing/playlists/index.html"));
            win.setSize(1000, 650, true);
            win.setPosition((workArea.width - 1000) / 2, (workArea.height - 650) / 2, true);
            win.resizable = true;
        }
    } catch (err) {
        print(`Func connectToYoutube. ${err.message}`, "err");
        win.reload();
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

ipcMain.on("use-saved-cookie-file", () => {
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
})

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