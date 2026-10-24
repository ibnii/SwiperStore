const input = document.querySelector("#gambar");
const kosong = document.querySelector(".gambar-pratinjau-kosong");
const bingkai = document.querySelector(".gambar-pratinjau-bingkai");

if (input && bingkai) {
    let url = null;
    let pratinjau = bingkai.querySelector(".gambar-pratinjau");

    input.addEventListener("change", () => {
        const berkas = input.files?.[0];

        if (!berkas) {
            return;
        }

        if (url) {
            URL.revokeObjectURL(url);
        }

        url = URL.createObjectURL(berkas);

        if (!pratinjau) {
            pratinjau = document.createElement("img");
            pratinjau.className = "gambar-pratinjau";
            pratinjau.alt = "Pratinjau thumbnail akun";
            bingkai.prepend(pratinjau);
        }

        pratinjau.src = url;
        pratinjau.hidden = false;

        if (kosong) {
            kosong.hidden = true;
        }

        if (bingkai) {
            bingkai.classList.add("gambar-pratinjau-bingkai--terisi");
        }
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
