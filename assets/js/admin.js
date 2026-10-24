const input = document.querySelector("#gambar");
const pratinjau = document.querySelector(".gambar-pratinjau");

if (input && pratinjau) {
    let url = null;

    input.addEventListener("change", () => {
        const berkas = input.files?.[0];

        if (!berkas) {
            return;
        }

        if (url) {
            URL.revokeObjectURL(url);
        }

        url = URL.createObjectURL(berkas);
        pratinjau.src = url;
        pratinjau.hidden = false;
    });

    window.addEventListener("pagehide", () => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    });
}

document.addEventListener("click", (event) => {
    document.querySelectorAll("details.menu[open]").forEach((menu) => {
        if (!menu.contains(event.target)) {
            menu.open = false;
        }
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    document.querySelectorAll("details.menu[open]").forEach((menu) => {
        menu.open = false;
    });
});

document.querySelectorAll("details.menu").forEach((menu) => {
    const panel = menu.querySelector(".menu__isi");

    menu.addEventListener("toggle", () => {
        panel.classList.remove("menu__isi--atas");

        if (!menu.open) {
            return;
        }

        if (panel.getBoundingClientRect().bottom > window.innerHeight - 8) {
            panel.classList.add("menu__isi--atas");
        }
    });
});
