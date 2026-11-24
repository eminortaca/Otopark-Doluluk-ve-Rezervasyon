const PAGE_LIMIT = 6;

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
const filterForm = document.getElementById('filter-form');
const searchInput = document.getElementById('search-input');
const floorFilter = document.getElementById('floor-filter');
const typeFilter = document.getElementById('type-filter');
const activeFilter = document.getElementById('active-filter');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const alertBox = document.getElementById('alert-box');
const totalSpotsInfo = document.getElementById('total-spots-info');
const spotsContainer = document.getElementById('spots-container');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfo = document.getElementById('page-info');

let currentPage = 1;
let totalPages = 1;

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

function createStatusCard(text, className) {
    const card = document.createElement('article');
    card.className = `card ${className}`;
    card.textContent = text;
    return card;
}

function createSpotCard(spot) {
    const isActive = Boolean(spot.is_active);

    const card = document.createElement('article');
    card.className = 'card spot-card';

    const header = document.createElement('div');
    header.className = 'spot-card-header';

    const codeEl = document.createElement('h3');
    codeEl.className = 'spot-code';
    codeEl.textContent = spot.spot_code;

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge ${isActive ? 'badge-success' : 'badge-danger'}`;
    statusBadge.textContent = isActive ? 'Kullanıma Açık' : 'Bakımda';

    header.append(codeEl, statusBadge);

    const meta = document.createElement('div');
    meta.className = 'spot-meta';

    const floorLine = document.createElement('p');
    floorLine.textContent = `Kat: ${formatFloor(spot.floor)}`;

    const typeLine = document.createElement('p');
    typeLine.textContent = `Tip: ${formatSpotType(spot.spot_type)}`;

    const priceLine = document.createElement('p');
    priceLine.className = 'spot-price';
    priceLine.textContent = `${Number(spot.hourly_rate).toFixed(2)} ₺ / saat`;

    meta.append(floorLine, typeLine, priceLine);

    const actions = document.createElement('div');
    actions.className = 'spot-actions';

    const detailLink = document.createElement('a');
    detailLink.href = `spot-detail.html?id=${encodeURIComponent(spot.id)}`;
    detailLink.className = isActive
        ? 'btn btn-sm btn-block'
        : 'btn btn-secondary btn-sm btn-block';
    detailLink.textContent = isActive ? 'Detay & Rezerve Et' : 'Detayı Gör';

    actions.appendChild(detailLink);
    card.append(header, meta, actions);
    return card;
}

function renderSpots(spots) {
    if (!spots || spots.length === 0) {
        spotsContainer.replaceChildren(
            createStatusCard('Arama kriterlerinize uygun park yeri bulunamadı.', 'empty-state')
        );
        return;
    }

    const cards = spots.map(createSpotCard);
    spotsContainer.replaceChildren(...cards);
}

function updatePagination(pagination) {
    const totalItems = Number(pagination?.totalItems) || 0;
    totalPages = Math.max(Number(pagination?.totalPages) || 1, 1);
    currentPage = Math.min(Math.max(Number(pagination?.currentPage) || currentPage, 1), totalPages);

    totalSpotsInfo.textContent = `Toplam ${totalItems} park yeri`;
    pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
}

async function loadSpots() {
    hideAlert();
    spotsContainer.replaceChildren(createStatusCard('Park yerleri yükleniyor...', 'loading-state'));

    const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_LIMIT)
    });

    const search = searchInput.value.trim();
    const floor = floorFilter.value;
    const spotType = typeFilter.value;
    const isActive = activeFilter.value;

    if (search) params.set('search', search);
    if (floor !== '') params.set('floor', floor);
    if (spotType) params.set('spot_type', spotType);
    if (isActive !== '') params.set('is_active', isActive);

    try {
        const res = await fetch(`/api/spots?${params.toString()}`, {
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

        renderSpots(result.data || []);
        updatePagination(result.pagination);
    } catch (error) {
        showAlert(error.message || 'Sunucuya bağlanılamadı.');
        totalSpotsInfo.textContent = 'Veri alınamadı';
        spotsContainer.replaceChildren(
            createStatusCard('Park yerleri yüklenirken bir hata oluştu.', 'empty-state')
        );
    }
}

filterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentPage = 1;
    loadSpots();
});

[floorFilter, typeFilter, activeFilter].forEach((selectEl) => {
    selectEl.addEventListener('change', () => {
        currentPage = 1;
        loadSpots();
    });
});

resetFiltersBtn.addEventListener('click', () => {
    filterForm.reset();
    currentPage = 1;
    loadSpots();
});

prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage -= 1;
        loadSpots();
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage += 1;
        loadSpots();
    }
});

if (token && currentUser) {
    loadSpots();
}
