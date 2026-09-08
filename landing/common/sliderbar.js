window.electronAPI.onAccountInfo(data => {
    document.querySelector("#account-name").textContent = data.name;
    document.querySelector("#account-img").src = data.img;
    checkScrollingText();
})

function checkScrollingText() {
    const text = document.querySelector("#account-name");
    const scrollingWrapper = document.querySelector("#scrolling-wrapper");
    
    if (text.clientWidth > scrollingWrapper.clientWidth) scrollingWrapper.className = "active";
    else scrollingWrapper.className = "";
}

document.querySelector("#account-btn").addEventListener("click", event => window.electronAPI.signOut());
document.querySelector("#settings").addEventListener("click", event => window.electronAPI.openSettings());