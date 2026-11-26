const token = localStorage.getItem('token');
let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem('user') || 'null');
} catch (error) {
    currentUser = null;
}

// Oturum kontrolü: Giriş yapılmamışsa login sayfasına yönlendir
if (!token || !currentUser) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

const isAdmin = currentUser?.role === 'admin';

const adminNavLink = document.getElementById('admin-nav-link');
const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const pageTitle = document.getElementById('page-title');
const reservationsCount = document.getElementById('reservations-count');
const alertBox = document.getElementById('alert-box');
const tableWrapper = document.getElementById('reservations-table-wrapper');
const userColHeader = document.getElementById('user-col-header');
const reservationsTbody = document.getElementById('reservations-tbody');
const emptyReservations = document.getElementById('empty-reservations');

if (currentUser) {
    const roleLabel = isAdmin ? 'Admin' : 'Kullanıcı';
    userGreeting.textContent = `${currentUser.full_name} (${roleLabel})`;

    if (isAdmin) {
        adminNavLink.style.display = 'inline-block';
        pageTitle.textContent = 'Tüm Rezervasyonlar';
        userColHeader.style.display = 'table-cell';
    } else {
        userColHeader.style.display = 'none';
    }
}

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
});

function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
}

function hideAlert() {
    alertBox.textContent = '';
    alertBox.style.display = 'none';
}

function formatFloor(floor) {
    const numericFloor = Number(floor);
    if (numericFloor === -1) return 'Bodrum Kat (-1)';
    if (numericFloor === 0) return 'Zemin Kat (0)';
    return `${numericFloor}. Kat`;
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

function getStatusMeta(status) {
    const statusMap = {
        aktif: { label: 'Aktif', badgeClass: 'badge-success' },
        tamamlandi: { label: 'Tamamlandı', badgeClass: 'badge-info' },
        iptal: { label: 'İptal', badgeClass: 'badge-danger' }
    };
    return statusMap[status] || { label: status || 'Bilinmiyor', badgeClass: 'badge-warning' };
}

function setLoadingRow() {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = isAdmin ? 8 : 7;
    cell.className = 'loading-state';
    cell.textContent = 'Rezervasyonlar yükleniyor...';
    row.appendChild(cell);
    reservationsTbody.replaceChildren(row);
}

function createReservationRow(reservation) {
    const row = document.createElement('tr');

    // Park Yeri Hücresi
    const spotCell = document.createElement('td');
    const spotLink = document.createElement('a');
    spotLink.className = 'spot-link';
    spotLink.href = `spot-detail.html?id=${encodeURIComponent(reservation.spot_id)}`;
    spotLink.textContent = reservation.spot_code;

    const floorSubtext = document.createElement('span');
    floorSubtext.className = 'table-subtext';
    floorSubtext.textContent = formatFloor(reservation.floor);

    spotCell.append(spotLink, floorSubtext);
    row.appendChild(spotCell);

    // Kullanıcı Hücresi (Sadece Admin)
    if (isAdmin) {
        const userCell = document.createElement('td');
        userCell.textContent = reservation.full_name || '-';
        row.appendChild(userCell);
    }

    // Plaka Hücresi
    const plateCell = document.createElement('td');
    plateCell.textContent = reservation.plate_number;
    row.appendChild(plateCell);

    // Başlangıç Hücresi
    const startCell = document.createElement('td');
    startCell.textContent = formatDateTime(reservation.start_time);
    row.appendChild(startCell);

    // Bitiş Hücresi
    const endCell = document.createElement('td');
    endCell.textContent = formatDateTime(reservation.end_time);
    row.appendChild(endCell);

    // Tutar Hücresi
    const priceCell = document.createElement('td');
    priceCell.textContent = `${Number(reservation.total_price).toFixed(2)} ₺`;
    row.appendChild(priceCell);

    // Durum Hücresi
    const statusCell = document.createElement('td');
    const statusMeta = getStatusMeta(reservation.status);
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge ${statusMeta.badgeClass}`;
    statusBadge.textContent = statusMeta.label;
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    // İşlem Hücresi
    const actionCell = document.createElement('td');
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-danger btn-sm';
    cancelBtn.textContent = 'İptal Et';
    cancelBtn.addEventListener('click', () => handleCancelReservation(reservation, cancelBtn));
    actionCell.appendChild(cancelBtn);
    row.appendChild(actionCell);

    return row;
}

function renderReservations(list) {
    reservationsCount.textContent = `Toplam ${list.length} rezervasyon`;

    if (list.length === 0) {
        tableWrapper.style.display = 'none';
        emptyReservations.style.display = 'block';
        reservationsTbody.replaceChildren();
        return;
    }

    tableWrapper.style.display = 'block';
    emptyReservations.style.display = 'none';

    const rows = list.map(createReservationRow);
    reservationsTbody.replaceChildren(...rows);
}

async function handleCancelReservation(reservation, buttonEl) {
    const confirmed = window.confirm(
        `${reservation.spot_code} (${reservation.plate_number}) rezervasyonunu iptal etmek istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    hideAlert();
    buttonEl.disabled = true;
    buttonEl.textContent = 'İptal ediliyor...';

    try {
        const res = await fetch(`/api/reservations/${encodeURIComponent(reservation.id)}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
            return;
        }

        // Başarılı silme işleminde sunucu 204 No Content döndürür
        if (res.status === 204) {
            await loadReservations();
            showAlert('Rezervasyon başarıyla iptal edildi.', 'success');
            return;
        }

        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Rezervasyon iptal edilemedi.');
    } catch (error) {
        showAlert(error.message || 'Sunucuya bağlanılamadı.');
        buttonEl.disabled = false;
        buttonEl.textContent = 'İptal Et';
    }
}

async function loadReservations() {
    tableWrapper.style.display = 'block';
    emptyReservations.style.display = 'none';
    setLoadingRow();

    try {
        const res = await fetch('/api/reservations', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
            return;
        }

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.message || 'Rezervasyonlar yüklenemedi.');
        }

        renderReservations(Array.isArray(data) ? data : []);
    } catch (error) {
        reservationsCount.textContent = 'Veri alınamadı';
        reservationsTbody.replaceChildren();
        tableWrapper.style.display = 'none';
        showAlert(error.message || 'Rezervasyonlar yüklenirken bir hata oluştu.');
    }
}

if (token && currentUser) {
    loadReservations();
}
