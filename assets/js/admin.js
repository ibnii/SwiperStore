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
