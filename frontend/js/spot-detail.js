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

const adminNavLink = document.getElementById('admin-nav-link');
const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const alertBox = document.getElementById('alert-box');
const spotCodeTitle = document.getElementById('spot-code-title');
const spotStatusBadge = document.getElementById('spot-status-badge');
const spotFloorEl = document.getElementById('spot-floor');
const spotTypeEl = document.getElementById('spot-type');
const spotRateEl = document.getElementById('spot-rate');
const spotIdDisplayEl = document.getElementById('spot-id-display');
const activeReservationsList = document.getElementById('active-reservations-list');
const maintenanceNotice = document.getElementById('maintenance-notice');
const reservationForm = document.getElementById('reservation-form');
const plateNumberInput = document.getElementById('plate-number');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');
const estimatedDurationEl = document.getElementById('estimated-duration');
const estimatedPriceEl = document.getElementById('estimated-price');
const reserveSubmitBtn = document.getElementById('reserve-submit-btn');

const urlParams = new URLSearchParams(window.location.search);
const rawSpotId = urlParams.get('id');
const spotId = rawSpotId && /^\d+$/.test(rawSpotId) && Number(rawSpotId) > 0 ? Number(rawSpotId) : null;

let currentSpot = null;

if (currentUser) {
    const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'Kullanıcı';
    userGreeting.textContent = `${currentUser.full_name} (${roleLabel})`;

    if (currentUser.role === 'admin') {
        adminNavLink.style.display = 'inline-block';
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

function formatSpotType(spotType) {
    const typeLabels = {
        standart: 'Standart',
        elektrikli: 'Elektrikli',
        engelli: 'Engelli'
    };
    return typeLabels[spotType] || spotType;
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

function toDatetimeLocalValue(date) {
    const pad = (n) => String(n).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeApiDateTime(value) {
    if (typeof value === 'string' && value.length === 16) {
        return `${value}:00`;
    }
    return value;
}

function setFormDisabled(disabled) {
    plateNumberInput.disabled = disabled;
    startTimeInput.disabled = disabled;
    endTimeInput.disabled = disabled;
    reserveSubmitBtn.disabled = disabled;
}

function initializeDefaultDates() {
    const defaultStart = new Date();
    defaultStart.setMinutes(0, 0, 0);
    defaultStart.setHours(defaultStart.getHours() + 1);

    const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

    startTimeInput.value = toDatetimeLocalValue(defaultStart);
    endTimeInput.value = toDatetimeLocalValue(defaultEnd);
}

function updatePricePreview() {
    if (!currentSpot) {
        estimatedDurationEl.textContent = '-';
        estimatedPriceEl.textContent = '-';
        return;
    }

    const startDate = new Date(startTimeInput.value);
    const endDate = new Date(endTimeInput.value);

    if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate <= startDate
    ) {
        estimatedDurationEl.textContent = '-';
        estimatedPriceEl.textContent = '-';
        return;
    }

    const durationHours = Math.ceil((endDate - startDate) / (1000 * 60 * 60));
    const totalPrice = (durationHours * Number(currentSpot.hourly_rate)).toFixed(2);

    estimatedDurationEl.textContent = `${durationHours} saat`;
    estimatedPriceEl.textContent = `${totalPrice} ₺`;
}

function renderActiveReservations(reservations) {
    if (!reservations || reservations.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'form-hint';
        emptyMsg.textContent = 'Bu park yeri için yaklaşan aktif rezervasyon bulunmuyor.';
        activeReservationsList.replaceChildren(emptyMsg);
        return;
    }

    const items = reservations.map((reservation) => {
        const item = document.createElement('div');
        item.className = 'reservation-item';

        const plateEl = document.createElement('span');
        plateEl.className = 'reservation-item-plate';
        plateEl.textContent = reservation.plate_number;

        const timeEl = document.createElement('span');
        timeEl.className = 'reservation-item-time';
        timeEl.textContent = `${formatDateTime(reservation.start_time)} - ${formatDateTime(reservation.end_time)}`;

        item.append(plateEl, timeEl);
        return item;
    });

    activeReservationsList.replaceChildren(...items);
}

async function loadSpotDetail() {
    if (!spotId) {
        spotCodeTitle.textContent = 'Park Yeri Bulunamadı';
        spotStatusBadge.className = 'badge badge-danger';
        spotStatusBadge.textContent = 'Hata';
        activeReservationsList.replaceChildren();
        setFormDisabled(true);
        showAlert('Geçersiz park yeri seçimi.');
        return;
    }

    try {
        const res = await fetch(`/api/spots/${encodeURIComponent(spotId)}`, {
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

        const spot = await res.json();
        if (!res.ok) {
            throw new Error(spot.message || 'Park yeri bilgileri getirilemedi.');
        }

        currentSpot = spot;
        const isActive = Boolean(spot.is_active);

        spotCodeTitle.textContent = `Park Yeri ${spot.spot_code}`;
        spotStatusBadge.className = `badge ${isActive ? 'badge-success' : 'badge-danger'}`;
        spotStatusBadge.textContent = isActive ? 'Kullanıma Açık' : 'Bakımda';

        spotFloorEl.textContent = formatFloor(spot.floor);
        spotTypeEl.textContent = formatSpotType(spot.spot_type);
        spotRateEl.textContent = `${Number(spot.hourly_rate).toFixed(2)} ₺ / saat`;
        spotIdDisplayEl.textContent = `#${spot.id}`;

        if (!isActive) {
            maintenanceNotice.style.display = 'block';
            setFormDisabled(true);
        } else {
            maintenanceNotice.style.display = 'none';
            setFormDisabled(false);
        }

        renderActiveReservations(spot.active_reservations || []);
        updatePricePreview();
    } catch (error) {
        currentSpot = null;
        spotCodeTitle.textContent = 'Park Yeri Bulunamadı';
        spotStatusBadge.className = 'badge badge-danger';
        spotStatusBadge.textContent = 'Hata';
        activeReservationsList.replaceChildren();
        setFormDisabled(true);
        showAlert(error.message || 'Park yeri detayları yüklenirken bir hata oluştu.');
    }
}

[startTimeInput, endTimeInput].forEach((inputEl) => {
    inputEl.addEventListener('change', updatePricePreview);
    inputEl.addEventListener('input', updatePricePreview);
});

reservationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    if (!spotId || !currentSpot || !currentSpot.is_active) {
        showAlert('Bu park yeri için rezervasyon oluşturulamaz.');
        return;
    }

    const plateNumber = plateNumberInput.value.trim();
    const startVal = startTimeInput.value;
    const endVal = endTimeInput.value;

    if (plateNumber.length < 5 || plateNumber.length > 15) {
        showAlert('Araç plakası 5 ile 15 karakter arasında olmalıdır.');
        return;
    }

    const startDate = new Date(startVal);
    const endDate = new Date(endVal);
    if (
        Number.isNaN(startDate.getTime()) ||
        Number.isNaN(endDate.getTime()) ||
        endDate <= startDate
    ) {
        showAlert('Bitiş tarihi ve saati, başlangıç zamanından sonra olmalıdır.');
        return;
    }

    reserveSubmitBtn.disabled = true;
    reserveSubmitBtn.textContent = 'Kaydediliyor...';

    try {
        const res = await fetch('/api/reservations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                spot_id: Number(spotId),
                plate_number: plateNumber,
                start_time: normalizeApiDateTime(startVal),
                end_time: normalizeApiDateTime(endVal)
            })
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
            return;
        }

        const data = await res.json();
        if (!res.ok) {
            const errMsg = data.errors?.[0]?.msg || data.message || 'Rezervasyon oluşturulamadı.';
            showAlert(errMsg);
            return;
        }

        plateNumberInput.value = '';
        await loadSpotDetail();

        const createdPrice = Number(data.reservation?.total_price);
        const priceText = Number.isFinite(createdPrice) ? ` Toplam tutar: ${createdPrice.toFixed(2)} ₺` : '';
        showAlert(`Rezervasyonunuz başarıyla oluşturuldu.${priceText}`, 'success');
    } catch (error) {
        showAlert('Sunucuya bağlanılamadı.');
    } finally {
        reserveSubmitBtn.textContent = 'Rezervasyonu Onayla';
        if (currentSpot && currentSpot.is_active) {
            reserveSubmitBtn.disabled = false;
        }
    }
});

if (token && currentUser) {
    initializeDefaultDates();
    loadSpotDetail();
}
