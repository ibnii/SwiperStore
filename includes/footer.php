<?php
declare(strict_types=1);

if (!defined('APP_MULAI')) {
    http_response_code(404);
    exit;
}
?>
<?php if (empty($area_admin)): ?>
    <footer class="situs-footer">
        <div class="wadah situs-footer__isi">
            <p class="merek merek--kecil">Swiper Store</p>
            <p>Akun premium pilihan, transaksi langsung via WhatsApp.</p>
        </div>
    </footer>
<?php endif; ?>

<?php foreach ($skrip ?? [] as $nama_skrip): ?>
    <script src="<?= e(aset('js/' . $nama_skrip . '.js')) ?>" defer></script>
<?php endforeach; ?>
</body>
</html>
