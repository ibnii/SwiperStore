<?php
declare(strict_types=1);

if (!defined('APP_MULAI')) {
    http_response_code(404);
    exit;
}
?>
<header class="admin-header">
    <div class="wadah admin-header__isi">
        <a class="merek" href="/admin">
            <span>Swiper Store</span>
            <span class="merek__aksen">Admin</span>
        </a>
        <form action="/admin/logout" method="post">
            <?= csrf_field() ?>
            <button type="submit" class="tombol tombol--garis">Keluar</button>
        </form>
    </div>
</header>
