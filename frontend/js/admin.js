const token = localStorage.getItem('token');
let currentUser = null;

try {
    currentUser = JSON.parse(localStorage.getItem('user') || 'null');
} catch (error) {
    currentUser = null;
}

// Oturum ve Admin rol kontrolü
if (!token || !currentUser) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
} else if (currentUser.role !== 'admin') {
    window.location.href = 'dashboard.html';
}

const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');
const adminSpotsCount = document.getElementById('admin-spots-count');
const alertBox = document.getElementById('alert-box');
const formHeading = document.getElementById('form-heading');
const spotForm = document.getElementById('spot-form');
const editSpotIdInput = document.getElementById('edit-spot-id');
const spotCodeInput = document.getElementById('spot-code');
const spotFloorInput = document.getElementById('spot-floor');
const spotTypeSelect = document.getElementById('spot-type');
const hourlyRateInput = document.getElementById('hourly-rate');
const spotActiveInput = document.getElementById('spot-active');
const saveSpotBtn = document.getElementById('save-spot-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const adminSpotsTbody = document.getElementById('admin-spots-tbody');

if (currentUser && currentUser.role === 'admin') {
    userGreeting.textContent = `${currentUser.full_name} (Admin)`;
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

function resetFormToCreateMode() {
    editSpotIdInput.value = '';
    spotForm.reset();
    spotFloorInput.value = '1';
    spotActiveInput.checked = true;
    formHeading.textContent = 'Yeni Park Yeri Ekle';
    saveSpotBtn.textContent = 'Park Yeri Ekle';
    cancelEditBtn.style.display = 'none';
}

function enterEditMode(spot) {
    hideAlert();
    editSpotIdInput.value = String(spot.id);
    spotCodeInput.value = spot.spot_code;
    spotFloorInput.value = String(spot.floor);
    spotTypeSelect.value = spot.spot_type;
    hourlyRateInput.value = String(Number(spot.hourly_rate));
    spotActiveInput.checked = Boolean(spot.is_active);
    formHeading.textContent = `Park Yerini Güncelle (${spot.spot_code})`;
    saveSpotBtn.textContent = 'Değişiklikleri Kaydet';
    cancelEditBtn.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setStatusRow(message, className) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = className;
    cell.textContent = message;
    row.appendChild(cell);
    adminSpotsTbody.replaceChildren(row);
}

function createSpotRow(spot) {
    const isActive = Boolean(spot.is_active);
    const row = document.createElement('tr');

    const codeCell = document.createElement('td');
    const spotLink = document.createElement('a');
    spotLink.className = 'spot-link';
    spotLink.href = `spot-detail.html?id=${encodeURIComponent(spot.id)}`;
    spotLink.textContent = spot.spot_code;
    codeCell.appendChild(spotLink);

    const floorCell = document.createElement('td');
    floorCell.textContent = formatFloor(spot.floor);

    const typeCell = document.createElement('td');
    typeCell.textContent = formatSpotType(spot.spot_type);

    const rateCell = document.createElement('td');
    rateCell.textContent = `${Number(spot.hourly_rate).toFixed(2)} ₺`;

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge ${isActive ? 'badge-success' : 'badge-danger'}`;
    statusBadge.textContent = isActive ? 'Kullanıma Açık' : 'Bakımda';
    statusCell.appendChild(statusBadge);

    const actionsCell = document.createElement('td');
    const actionGroup = document.createElement('div');
    actionGroup.className = 'action-group';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Düzenle';
    editBtn.addEventListener('click', () => enterEditMode(spot));

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = `btn ${isActive ? 'btn-danger' : ''} btn-sm`.trim();
    toggleBtn.textContent = isActive ? 'Bakıma Al' : 'Aktif Et';
    toggleBtn.addEventListener('click', () => toggleSpotActive(spot, toggleBtn));

    actionGroup.append(editBtn, toggleBtn);
    actionsCell.appendChild(actionGroup);

    row.append(codeCell, floorCell, typeCell, rateCell, statusCell, actionsCell);
    return row;
}

function renderAdminSpots(spots) {
    adminSpotsCount.textContent = `Toplam ${spots.length} park yeri`;

    if (spots.length === 0) {
        setStatusRow('Henüz kayıtlı park yeri bulunmuyor.', 'empty-state');
        return;
    }

    const rows = spots.map(createSpotRow);
    adminSpotsTbody.replaceChildren(...rows);
}

async function loadAdminSpots() {
    setStatusRow('Park yerleri yükleniyor...', 'loading-state');

    try {
        const res = await fetch('/api/spots?page=1&limit=100', {
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

        const result = await res.json();
        if (!res.ok) {
            throw new Error(result.message || 'Park yerleri yüklenemedi.');
        }

        renderAdminSpots(result.data || []);
    } catch (error) {
        adminSpotsCount.textContent = 'Veri alınamadı';
        setStatusRow('Park yerleri yüklenirken bir hata oluştu.', 'empty-state');
        showAlert(error.message || 'Sunucuya bağlanılamadı.');
    }
}

async function toggleSpotActive(spot, buttonEl) {
    hideAlert();
    const nextActive = !Boolean(spot.is_active);
    buttonEl.disabled = true;

    try {
        const res = await fetch(`/api/spots/${encodeURIComponent(spot.id)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                spot_code: spot.spot_code,
                floor: Number(spot.floor),
                spot_type: spot.spot_type,
                hourly_rate: Number(spot.hourly_rate),
                is_active: nextActive
            })
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
            return;
        }

        if (res.status === 403) {
            window.location.href = 'dashboard.html';
            return;
        }

        const data = await res.json();
        if (!res.ok) {
            const errMsg = data.errors?.[0]?.msg || data.message || 'Durum güncellenemedi.';
            throw new Error(errMsg);
        }

        await loadAdminSpots();
        showAlert(
            `${spot.spot_code} ${nextActive ? 'kullanıma açıldı' : 'bakıma alındı'}.`,
            'success'
        );
    } catch (error) {
        showAlert(error.message || 'Sunucuya bağlanılamadı.');
        buttonEl.disabled = false;
    }
}

cancelEditBtn.addEventListener('click', () => {
    hideAlert();
    resetFormToCreateMode();
});

spotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const editId = editSpotIdInput.value.trim();
    const spotCode = spotCodeInput.value.trim().toUpperCase();
    const floor = Number(spotFloorInput.value);
    const spotType = spotTypeSelect.value;
    const hourlyRate = Number(hourlyRateInput.value);
    const isActive = Boolean(spotActiveInput.checked);

    if (!spotCode || spotCode.length > 20) {
        showAlert('Park yeri kodu zorunludur ve en fazla 20 karakter olabilir.');
        return;
    }

    if (!Number.isInteger(floor) || floor < -5 || floor > 20) {
        showAlert('Kat bilgisi -5 ile 20 arasında bir tam sayı olmalıdır.');
        return;
    }

    if (Number.isNaN(hourlyRate) || hourlyRate < 0) {
        showAlert('Saatlik ücret 0 veya daha büyük bir sayı olmalıdır.');
        return;
    }

    const isEditing = Boolean(editId);
    const endpoint = isEditing ? `/api/spots/${encodeURIComponent(editId)}` : '/api/spots';
    const method = isEditing ? 'PUT' : 'POST';

    saveSpotBtn.disabled = true;
    saveSpotBtn.textContent = 'Kaydediliyor...';

    try {
        const res = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                spot_code: spotCode,
                floor,
                spot_type: spotType,
                hourly_rate: hourlyRate,
                is_active: isActive
            })
        });

        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'index.html';
            return;
        }

        if (res.status === 403) {
            window.location.href = 'dashboard.html';
            return;
        }

        const data = await res.json();
        if (!res.ok) {
            const errMsg = data.errors?.[0]?.msg || data.message || 'İşlem tamamlanamadı.';
            throw new Error(errMsg);
        }

        resetFormToCreateMode();
        await loadAdminSpots();
        showAlert(
            isEditing ? 'Park yeri başarıyla güncellendi.' : 'Yeni park yeri başarıyla eklendi.',
            'success'
        );
    } catch (error) {
        showAlert(error.message || 'Sunucuya bağlanılamadı.');
    } finally {
        saveSpotBtn.disabled = false;
        saveSpotBtn.textContent = editSpotIdInput.value ? 'Değişiklikleri Kaydet' : 'Park Yeri Ekle';
    }
});

if (token && currentUser && currentUser.role === 'admin') {
    loadAdminSpots();
}
