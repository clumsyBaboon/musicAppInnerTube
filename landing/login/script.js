document.querySelector("#select").addEventListener("click", event => window.electronAPI.selectCookieFile());

document.querySelector("#saved").addEventListener("click", event => window.electronAPI.useSavedCookieFile());

window.electronAPI.onChangeLoginToLoading(() => {
    document.querySelector(".buttons").style.opacity = "0";
    document.querySelector("#text-hero").textContent = "Loading...";
})