// GLOBAL DATA & SHARED LOGIC
let allNotifProducts = [];
let activeFilters = [];
let base64Image = null;
let editBase64Image = null;
let isDeleteMode = false;
let currentEditingProductId = null;
let currentDeletingProductId = null;
const productCache = new Map();

// =========================================================
// URL BACKEND
// =========================================================
const BASE_URL = "https://sistemmonitorw99-production.up.railway.app"; 

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('is-open');
}

function closeModalEl(el) {
    if (el) el.classList.remove('is-open');
}

window.closeModals = function () {
    document.querySelectorAll('.modal-overlay.is-open').forEach(closeModalEl);
};

// =========================================================
// AUTHENTICATION GUARD
// =========================================================
(function checkAuthentication() {
    const currentPath = window.location.pathname.split('/').pop();
    
    const publicPages = ['index.html', '']; 
    
    if (!publicPages.includes(currentPath)) {
        const userId = localStorage.getItem('loggedInUserId');
        
        if (!userId || userId === "undefined") {
            window.location.replace('index.html');
        }
    }
})();

// =========================================================
// LOGIN PAGE LOGIC
// =========================================================

function checkPasswordStrength(password) {
    const criteria = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[^A-Za-z0-9]/.test(password)
    };

    if (!criteria.minLength || !criteria.hasUpperCase || !criteria.hasLowerCase || !criteria.hasNumber || !criteria.hasSymbol) {
        let errorMsg = "Password tidak memenuhi kriteria keamanan sistem!\nHarus mencakup:\n";
        if (!criteria.minLength) errorMsg += "• Minimal 8 karakter\n";
        if (!criteria.hasUpperCase) errorMsg += "• Minimal 1 huruf BESAR (A-Z)\n";
        if (!criteria.hasLowerCase) errorMsg += "• Minimal 1 huruf kecil (a-z)\n";
        if (!criteria.hasNumber) errorMsg += "• Minimal 1 angka (0-9)\n";
        if (!criteria.hasSymbol) errorMsg += "• Minimal 1 karakter simbol khusus/unik\n";

        return { isValid: false, message: errorMsg };
    }
    return { isValid: true };
}

window.openForgotModal = function (event) {
    if (event) event.preventDefault();
    openModal('forgotModal');
};

window.closeForgotModal = function () {
    const modal = document.getElementById('forgotModal');
    if (modal) {
        closeModalEl(modal);
        document.getElementById('forgotEmailInput').value = '';
        document.getElementById('forgotNamaInput').value = '';
        document.getElementById('forgotNewPasswordInput').value = '';

        const forgotErrorContainer = document.getElementById('forgotErrorMsg');
        if (forgotErrorContainer) {
            forgotErrorContainer.innerText = '';
            forgotErrorContainer.style.display = 'none';
            forgotErrorContainer.classList.remove('success-text');
        }
    }
};

window.handleForgotPasswordValidation = async function () {
    const email = document.getElementById('forgotEmailInput').value;
    const nama = document.getElementById('forgotNamaInput').value;
    const newPassword = document.getElementById('forgotNewPasswordInput').value;
    const errorContainer = document.getElementById('forgotErrorMsg');

    if (errorContainer) {
        errorContainer.innerText = '';
        errorContainer.style.display = 'none';
        errorContainer.classList.remove('success-text');
    }

    if (!email.trim() || !nama.trim() || !newPassword.trim()) {
        if (errorContainer) {
            errorContainer.innerText = "Peringatan: Semua kolom data input wajib diisi!";
            errorContainer.style.display = 'block';
        }
        return;
    }

    const passwordCheck = checkPasswordStrength(newPassword);
    if (!passwordCheck.isValid) {
        if (errorContainer) {
            errorContainer.innerText = passwordCheck.message;
            errorContainer.style.display = 'block';
        }
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, nama: nama, new_password: newPassword })
        });
        const result = await response.json();

        if (result.status === "success") {
            if (errorContainer) {
                errorContainer.innerText = "Berhasil! Password akun Anda telah diperbarui ke sistem. Silakan login kembali.";
                errorContainer.classList.add('success-text');
                errorContainer.style.display = 'block';
            }
            setTimeout(() => {
                closeForgotModal();
            }, 2500); 
        } else {
            if (errorContainer) {
                errorContainer.innerText = "Gagal memproses reset: " + result.message;
                errorContainer.style.display = 'block';
            }
        }
    } catch (error) {
        if (errorContainer) {
            errorContainer.innerText = "Error: Gagal terhubung ke server database.";
            errorContainer.style.display = 'block';
        }
    }
};

document.addEventListener('DOMContentLoaded', function () {
    try {
        const swipePages = ['warkop99_notifications.html','warkop99_dashboard.html','warkop99_profile.html'];
        const currentPath = window.location.pathname.split('/').pop();
        if (swipePages.includes(currentPath)) {
            const app = document.querySelector('.app');
            if (app && !app.querySelector('.app-inner')) {
                const excludeSel = ['.tab-bar', '.fab-dock'];
                const children = Array.from(app.children);
                const toWrap = children.filter(ch => {
                    if (!ch.classList) return true;
                    return !excludeSel.some(sel => ch.matches(sel));
                });

                if (toWrap.length) {
                    const wrapper = document.createElement('div');
                    wrapper.className = 'app-inner';
                    app.insertBefore(wrapper, toWrap[0]);
                    toWrap.forEach(ch => wrapper.appendChild(ch));
                }
            }
        }
    } catch (err) {
        console.error('wrap app content failed', err);
    }
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.getElementById('passwordInput');
    const togglePassword = document.getElementById('togglePassword');
    const loginErrorContainer = document.getElementById('loginErrorMsg');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            document.getElementById('eyeSlashIcon').style.display = type === 'text' ? 'none' : 'block';
            document.getElementById('eyeOpenIcon').style.display = type === 'text' ? 'block' : 'none';
        });
    }

    if (loginForm && emailInput && passwordInput) {
        loginForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const password = passwordInput.value;

            if (loginErrorContainer) {
                loginErrorContainer.innerText = '';
                loginErrorContainer.style.display = 'none';
            }

            try {
                const response = await fetch(`${BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: emailInput.value, password: password })
                });
                const result = await response.json();
                
                if (result.status === "success") {
                    localStorage.setItem('loggedInUserId', result.user.id_user);
                    window.location.href = 'warkop99_dashboard.html';
                } else {
                    if (loginErrorContainer) {
                        loginErrorContainer.innerText = "Email atau password tidak sesuai.";
                        loginErrorContainer.style.display = 'block';
                    }
                }
            } catch (error) {
                if (loginErrorContainer) {
                    loginErrorContainer.innerText = "Error: Tidak dapat terhubung ke server backend.";
                    loginErrorContainer.style.display = 'block';
                }
            }
        });
    }
});

// =========================================================
// DASHBOARD PAGE LOGIC
// =========================================================

window.toggleDeleteMode = function () {
    const productList = document.getElementById('productList');
    const menuSubtitle = document.getElementById('menuSubtitle');
    if (!productList || !menuSubtitle) return;
    
    isDeleteMode = !isDeleteMode;
    productList.classList.toggle('delete-mode-active', isDeleteMode);
    menuSubtitle.innerText = isDeleteMode ? "Mode hapus — ketuk ikon sampah di kartu" : "Ketuk item untuk ubah stok";
    menuSubtitle.classList.toggle('is-danger', isDeleteMode);
    document.querySelector('.fab--del')?.classList.toggle('is-active', isDeleteMode);
};

function setThumbImage(el, url) {
    if (!el || !url) return;
    el.style.backgroundImage = `url(${JSON.stringify(url)})`;
    el.classList.add('has-image');
}

window.handleProductClick = function (id) {
    if (isDeleteMode) return;
    const product = productCache.get(Number(id));
    if (!product) return;

    currentEditingProductId = Number(id);
    editBase64Image = null;
    document.getElementById('editModalName').innerText = product.name;
    document.getElementById('editModalStock').innerText = product.stock;
    setThumbImage(document.getElementById('editModalImg'), product.img);
    openModal('editModal');
};

window.openAddModal = function () {
    base64Image = null;
    const nameEl = document.getElementById('addProductName');
    const stockEl = document.getElementById('addProductStock');
    const thumb = document.getElementById('addImgPreview');
    const plus = document.getElementById('addImgPlus');
    if (nameEl) nameEl.value = '';
    if (stockEl) stockEl.innerText = '3';
    if (thumb) {
        thumb.style.backgroundImage = '';
        thumb.classList.remove('has-image');
    }
    if (plus) plus.style.display = '';
    openModal('addModal');
};

window.openDeleteModal = function (id, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const product = productCache.get(Number(id));
    if (!product) return;

    currentDeletingProductId = Number(id);
    document.getElementById('deleteModalName').innerText = product.name;
    setThumbImage(document.getElementById('deleteModalImg'), product.img);
    openModal('deleteModal');
};

async function fetchProducts() {
    try {
        const response = await fetch(`${BASE_URL}/api/products`);
        const products = await response.json();
        const productList = document.getElementById('productList');
        if (!productList) return;
        
        productList.innerHTML = '';
        productCache.clear();
        products.forEach(product => {
            const displayImg = product.image_url || 'website_images/addimage.png';
            const safeName = escapeHtml(product.nama_produk);
            const safeImg = escapeHtml(displayImg);
            const fillClass = product.stok <= 5 ? 'low' : product.stok <= 15 ? 'mid' : 'ok';
            const pct = Math.min(100, Math.round((product.stok / 30) * 100));

            productCache.set(product.id_produk, {
                name: product.nama_produk,
                stock: product.stok,
                img: displayImg
            });

            productList.innerHTML += `
                <div class="product-card product-card--${fillClass}" data-id="${product.id_produk}">
                    <div class="product-card__thumb" style="background-image:url('${safeImg}')"></div>
                    <div class="product-card__body">
                        <div class="product-card__info">
                            <div class="inner-block inner-block--name">${safeName}</div>
                            <div class="inner-block inner-block--stock">
                                <div class="label">STOK</div>
                                <div class="value">${product.stok}</div>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="product-card__delete" aria-label="Hapus">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2m-1 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h10"/></svg>
                    </button>
                </div>`;
        });
    } catch (error) { 
        console.error("Error loading products:", error); 
    }
}

window.saveStockToDatabase = async function () {
    const newStock = parseInt(document.getElementById('editModalStock').innerText);
    const userId = localStorage.getItem('loggedInUserId') || 1;
    const payload = { stok: newStock, id_user: userId };
    
    if (editBase64Image) payload.image_url = editBase64Image;

    await fetch(`${BASE_URL}/api/products/${currentEditingProductId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    window.closeModals();
    fetchProducts();
};

window.addProductToDatabase = async function () {
    const name = document.getElementById('addProductName').value;
    const stock = parseInt(document.getElementById('addProductStock').innerText);
    const userId = localStorage.getItem('loggedInUserId') || 1;
    
    if (!name.trim()) return alert("Nama produk tidak boleh kosong!");

    await fetch(`${BASE_URL}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_produk: name, stok: stock, image_url: base64Image, id_user: userId })
    });
    
    window.closeModals();
    fetchProducts();
};

window.deleteProductFromDatabase = async function () {
    if (!currentDeletingProductId) return;
    const userId = localStorage.getItem('loggedInUserId') || 1;
    await fetch(`${BASE_URL}/api/products/${currentDeletingProductId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_user: userId })
    });
    
    window.closeModals();
    fetchProducts();
};

// =========================================================
// NOTIFICATION PAGE LOGIC
// =========================================================
let lowStockNotif = [];
let newProductNotif = [];

async function fetchNotifications() {
    try {
        const [lowStockRes, allProductsRes] = await Promise.all([
            fetch(`${BASE_URL}/api/alerts/low-stock`),
            fetch(`${BASE_URL}/api/products`)
        ]);

        lowStockNotif = await lowStockRes.json();
        newProductNotif = await allProductsRes.json();

        renderNotifications();
    } catch (error) {
        console.error("Kesalahan memuat notifikasi:", error);
    }
}

window.renderNotifications = function () {
    const list = document.getElementById('notificationList');
    if (!list) return;
    list.innerHTML = '';

    let stokRendahItems = lowStockNotif.map(p => ({ ...p, type: 'red' }));
    let produkBaruItems = [...newProductNotif]
        .sort((a, b) => b.id_produk - a.id_produk)
        .map(p => ({ ...p, type: 'blue' }));

    let itemsToShow = [];

    if (activeFilters.length === 0) {
        itemsToShow = [...stokRendahItems, ...produkBaruItems];
    } else {
        if (activeFilters.includes('stok_rendah')) itemsToShow.push(...stokRendahItems);
        if (activeFilters.includes('produk_baru')) itemsToShow.push(...produkBaruItems);
    }

    const seenIds = new Set();

    itemsToShow.forEach(item => {
        if (!seenIds.has(item.id_produk)) {
            seenIds.add(item.id_produk);

            const displayImg = item.image_url || 'website_images/addimage.png';
            const badgeText = item.type === 'red' ? 'Stok rendah' : 'Produk baru';
            const safeName = escapeHtml(item.nama_produk);
            const safeImg = escapeHtml(displayImg);

            list.innerHTML += `
                <div class="notif-card ${item.type}">
                    <div class="notif-card__thumb" style="background-image:url('${safeImg}')"></div>
                    <div class="notif-card__body">
                        <span class="notif-badge">${badgeText}</span>
                        <div class="notif-text-row"><span>Nama</span><span>${safeName}</span></div>
                        <div class="notif-text-row"><span>Stok</span><span>${item.stok}</span></div>
                    </div>
                </div>`;
        }
    });
};

window.switchNotifTab = function (tabName, element) {
    if (tabName === 'all') {
        activeFilters = [];
        document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active-red', 'active-blue'));
    } else {
        const index = activeFilters.indexOf(tabName);
        if (index > -1) {
            activeFilters.splice(index, 1);
            element.classList.remove('active-red', 'active-blue');
        } else {
            activeFilters.push(tabName);
            element.classList.add(tabName === 'stok_rendah' ? 'active-red' : 'active-blue');
        }
    }
    renderNotifications();
};

// =========================================================
// INITIALIZATION & SEARCH
// =========================================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModalEl(overlay);
        });
    });

    document.querySelectorAll('.modal-sheet').forEach(sheet => {
        sheet.addEventListener('click', e => e.stopPropagation());
    });

    const productList = document.getElementById('productList');
    if (productList) {
        productList.addEventListener('click', e => {
            const card = e.target.closest('.product-card');
            if (!card) return;

            const id = card.dataset.id;
            const deleteBtn = e.target.closest('.product-card__delete');

            if (deleteBtn) {
                e.preventDefault();
                e.stopPropagation();
                if (isDeleteMode) openDeleteModal(id, e);
                return;
            }

            if (!isDeleteMode) handleProductClick(id);
        });
        fetchProducts();
    }
    if (document.getElementById('notificationList')) fetchNotifications();
    
    if (document.getElementById('loggedPegawaiName')) {
        fetchUserProfile();
    }

    document.getElementById('searchInput')?.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.product-card').forEach(card => {
            const name = (card.querySelector('.inner-block--name')?.innerText || '').toLowerCase();
            card.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });

    document.getElementById('notifSearchInput')?.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.notif-card').forEach(card => {
            const name = card.querySelector('.notif-text-row span:last-child').innerText.toLowerCase();
            card.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });

    document.getElementById('imageUpload')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 1048576) {
            alert("Peringatan: Ukuran gambar terlalu besar! Maksimal 1MB.");
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = f => {
            base64Image = f.target.result;
            const thumb = document.getElementById('addImgPreview');
            setThumbImage(thumb, base64Image);
            const plus = document.getElementById('addImgPlus');
            if (plus) plus.style.display = 'none';
        };
        if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    });

    document.getElementById('editImageUpload')?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 1048576) {
            alert("Peringatan: Ukuran gambar terlalu besar! Maksimal 1MB.");
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = f => {
            editBase64Image = f.target.result;
            setThumbImage(document.getElementById('editModalImg'), editBase64Image);
        };
        if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    });

    const qtyButtons = document.querySelectorAll('.qty-btn');
    if (qtyButtons.length > 0) {
        qtyButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const span = this.parentElement.querySelector('span');
                if (span) {
                    let val = parseInt(span.innerText) || 0;
                    const label = this.textContent.trim();
                    const isPlus = label === '+' || label === '＋';
                    span.innerText = isPlus ? val + 1 : Math.max(0, val - 1);
                }
            });
        });
    }
});

// =========================================================
// PROFILE & HISTORY LOGIC
// =========================================================
async function fetchUserProfile() {
    const userId = localStorage.getItem('loggedInUserId');

    const nameElement = document.getElementById('loggedPegawaiName');
    const roleElement = document.getElementById('loggedPegawaiRole');
    const profileImg = document.getElementById('profileUserImg');

    try {
        const response = await fetch(`${BASE_URL}/api/users/${userId}`);
        const result = await response.json();

        if (result.status === "success" && result.user) {
            if (nameElement) nameElement.innerText = result.user.nama;
            if (roleElement) roleElement.innerText = result.user.role;
            if (profileImg) profileImg.src = result.user.profile_url || 'website_images/logo99.jpg';
        }
    } catch (error) {
        console.error("Gagal mengambil profil:", error);
        if (nameElement) nameElement.innerText = "Gagal Memuat";
    }
}

window.logoutAccount = async function () {
    const userId = localStorage.getItem('loggedInUserId');
    if (userId) {
        try {
            await fetch(`${BASE_URL}/api/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_user: userId })
            });
        } catch (e) { console.error("Gagal logout di server:", e); }
    }
    localStorage.removeItem('loggedInUserId');
    window.location.href = 'index.html';
};

window.saveNewPassword = async function () {
    const passOld = document.getElementById('oldPassword').value;
    const pass1 = document.getElementById('newPassword').value;
    const pass2 = document.getElementById('verifyPassword').value;
    const errorContainer = document.getElementById('profileErrorMsg');

    if (errorContainer) {
        errorContainer.innerText = '';
        errorContainer.style.display = 'none';
        errorContainer.classList.remove('success-text'); 
    }

    if (!passOld || !pass1 || !pass2) {
        if (errorContainer) {
            errorContainer.innerText = "Peringatan: Semua kolom password wajib diisi!";
            errorContainer.style.display = 'block';
        }
        return;
    }

    if (pass1 !== pass2) {
        if (errorContainer) {
            errorContainer.innerText = "Gagal: Verifikasi password baru tidak cocok.";
            errorContainer.style.display = 'block';
        }
        return;
    }

    const passwordCheck = checkPasswordStrength(pass1);
    if (!passwordCheck.isValid) {
        if (errorContainer) {
            errorContainer.innerText = passwordCheck.message;
            errorContainer.style.display = 'block';
        }
        return;
    }

    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) return alert("Anda harus login untuk mengubah password.");

    try {
        const response = await fetch(`${BASE_URL}/api/users/${userId}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ old_password: passOld, new_password: pass1 })
        });
        const result = await response.json();

        if (result.status === "success") {
            if (errorContainer) {
                errorContainer.innerText = "Berhasil! Password akun Anda telah diperbarui ke sistem.";
                errorContainer.classList.add('success-text');
                errorContainer.style.display = 'block';
            }
            setTimeout(() => {
                closePasswordModal();
            }, 2500);
        } else {
            if (errorContainer) {
                errorContainer.innerText = "Gagal: " + (result.message || "Password lama tidak cocok.");
                errorContainer.style.display = 'block';
            }
        }
    } catch (e) {
        console.error("Gagal save password:", e);
        if (errorContainer) {
            errorContainer.innerText = "Error: Gagal terhubung ke server database.";
            errorContainer.style.display = 'block';
        }
    }
};

window.showHistory = function () {
    document.getElementById('view-profile').classList.add('view-hidden');
    document.getElementById('view-history').classList.remove('view-hidden');
    const title = document.getElementById('pageTitle');
    const hint = document.getElementById('pageHint');
    if (title) title.textContent = 'Riwayat';
    if (hint) hint.textContent = 'Aktivitas stok & produk';
    window.renderDatabaseHistory();
};

window.showProfile = function () {
    document.getElementById('view-history').classList.add('view-hidden');
    document.getElementById('view-profile').classList.remove('view-hidden');
    const title = document.getElementById('pageTitle');
    const hint = document.getElementById('pageHint');
    if (title) title.textContent = 'Akun';
    if (hint) hint.textContent = 'Profil & pengaturan';
};

let databaseHistory = [];

window.renderDatabaseHistory = async function () {
    const list = document.getElementById('history-list');
    if (!list) return;
    try {
        const response = await fetch(`${BASE_URL}/api/history`);
        databaseHistory = await response.json();
        filterHistory('ALL', document.querySelector('#view-history .tab-btn'));
    } catch (e) {
        console.error("Gagal load history:", e);
    }
};

window.filterHistory = function (filterType, element) {
    if (element) {
        document.querySelectorAll('#view-history .tab-btn').forEach(btn => {
            btn.classList.remove('active-blue');
        });
        element.classList.add('active-blue');
    }

    const list = document.getElementById('history-list');
    list.innerHTML = '';
    let filtered = databaseHistory;

    if (filterType !== 'ALL') {
        filtered = databaseHistory.filter(h => h.jenis_transaksi.startsWith(filterType));
    }

    if (filtered.length === 0) {
        list.innerHTML = '<p class="empty-state">Belum ada riwayat untuk kategori ini.</p>';
        return;
    }

    let lastDate = null;

    filtered.forEach(item => {
        const txType = item.jenis_transaksi;
        let badgeCol = '#33a1ff';
        let detailTipe = txType;
        let detailStok = item.jumlah;
        let detailNama = item.nama_produk || '-';

        if (txType === 'MASUK') {
            badgeCol = '#5ddc58';
            detailNama = '-';
            detailStok = '-';
        } else if (txType === 'KELUAR') {
            badgeCol = '#666';
            detailNama = '-';
            detailStok = '-';
        } else if (txType === 'PRODUK BARU') {
            badgeCol = '#33a1ff';
            detailStok = '+' + item.jumlah;
        } else if (txType.startsWith('UPDATE')) {
            badgeCol = '#ffaa00';
            const match = txType.match(/\((.*?)\)/);
            if (match) detailStok = match[1];
            detailTipe = 'UPDATE STOK';
        } else if (txType === 'DELETE') {
            badgeCol = '#ff4d4d';
            detailStok = 'DIHAPUS';
        }

        let currentDate = item.tanggal || 'Hari ini';

        if (currentDate !== lastDate) {
            list.innerHTML += `<div class="timeline-date">${escapeHtml(currentDate)}</div>`;
            lastDate = currentDate;
        }

        const userAvatar = item.user_avatar || 'website_images/logo99.jpg';

        const safeUser = escapeHtml(item.user_nama || 'User');
        const safeTipe = escapeHtml(detailTipe);
        const safeNama = escapeHtml(detailNama);
        const safeStok = escapeHtml(String(detailStok));

        list.innerHTML += `
            <article class="history-card" style="--accent: ${badgeCol}">
                <img src="${userAvatar}" class="history-avatar" alt="">
                <div class="history-body">
                    <div class="history-card__head">
                        <span class="history-badge" style="background:${badgeCol}20;color:${badgeCol}">${safeTipe}</span>
                        <span class="history-user">${safeUser}</span>
                    </div>
                    <dl class="history-meta">
                        <div class="history-meta__row"><dt>Nama</dt><dd>${safeNama}</dd></div>
                        <div class="history-meta__row"><dt>Stok</dt><dd>${safeStok}</dd></div>
                    </dl>
                </div>
            </article>`;
    });
};

// FUNGSI MODAL UBAH PASSWORD 
window.openPasswordModal = function () {
    openModal('passwordModal');
};

window.closePasswordModal = function () {
    const modal = document.getElementById('passwordModal');
    if (modal) {
        closeModalEl(modal);
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('verifyPassword').value = '';

        const profileError = document.getElementById('profileErrorMsg');
        if (profileError) {
            profileError.innerText = '';
            profileError.style.display = 'none';
        }
    }
};

// FUNGSI UPLOAD FOTO PROFIL
document.getElementById('profileImageInput')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async f => {
        const base64Str = f.target.result;
        document.getElementById('profileUserImg').src = base64Str;

        const userId = localStorage.getItem('loggedInUserId');
        if (userId) {
            try {
                await fetch(`${BASE_URL}/api/users/${userId}/profile_image`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profile_url: base64Str })
                });

                if (!document.getElementById('view-history').classList.contains('view-hidden')) {
                    window.renderDatabaseHistory();
                }
            } catch (err) {
                console.error("Gagal save foto profil:", err);
            }
        }
    };
    reader.readAsDataURL(file);
});

// =========================================================
// SWIPE NAVIGATION (mobile)
// =========================================================
function initSwipeNavigation() {
    if (window.innerWidth > 768) return;

    const pages = [
        'warkop99_notifications.html',
        'warkop99_dashboard.html',
        'warkop99_profile.html'
    ];

    const path = window.location.pathname.split('/').pop();
    let idx = pages.indexOf(path);
    if (idx === -1) {
        return;
    }

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let isNavigating = false;

    function navigateWithAnimation(url, direction) {
        if (!url || isNavigating) return;
        isNavigating = true;
        
        document.body.classList.remove('page-slide-left', 'page-slide-right');
        document.body.classList.add(direction === 'left' ? 'page-slide-left' : 'page-slide-right');
        
        setTimeout(() => {
            window.location.href = url;
        }, 200); 
    }

    const minDistance = 50; // px
    const maxVerticalDeviation = 75; // px

    function onTouchStart(e) {
        const historyView = document.getElementById('view-history');
        if (historyView && !historyView.classList.contains('view-hidden')) return;

        if (document.querySelector('.modal-overlay.is-open')) return;
        const active = document.activeElement;
        if (active && (['INPUT','TEXTAREA','SELECT'].includes(active.tagName) || active.isContentEditable)) return;

        const targetEl = e.target || (e.touches && e.touches[0] && e.touches[0].target);
        if (targetEl && (targetEl.closest && targetEl.closest('input,textarea,select,button,.modal-overlay,.modal-sheet,.qty-controls,.product-card__delete,.tab-bar,.fab-dock'))) return;

        const t = e.touches ? e.touches[0] : e;
        startX = t.clientX;
        startY = t.clientY;
        tracking = true;
    }

    function onTouchEnd(e) {
        if (!tracking) return;
        const t = (e.changedTouches && e.changedTouches[0]) || e;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        tracking = false;

        if (Math.abs(dy) > maxVerticalDeviation) return;
        if (Math.abs(dx) < minDistance) return;

        if (dx < 0) {
            const newIdx = Math.min(pages.length - 1, idx + 1);
            if (newIdx !== idx && pages[newIdx]) {
                const url = pages[newIdx];
                idx = newIdx;
                navigateWithAnimation(url, 'left');
            }
        } else {
            const newIdx = Math.max(0, idx - 1);
            if (newIdx !== idx && pages[newIdx]) {
                const url = pages[newIdx];
                idx = newIdx;
                navigateWithAnimation(url, 'right');
            }
        }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    window.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') onTouchStart(e);
    }, { passive: true });
    window.addEventListener('pointerup', function (e) {
        if (e.pointerType !== 'mouse') onTouchEnd(e);
    }, { passive: true });

    window.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        onTouchStart(e);
    });
    window.addEventListener('mouseup', function (e) {
        if (e.button !== 0) return;
        onTouchEnd(e);
    });
}

const _swipePages = ['warkop99_notifications.html','warkop99_dashboard.html','warkop99_profile.html'];
const _currentPath = window.location.pathname.split('/').pop();
if (_swipePages.includes(_currentPath)) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSwipeNavigation);
    } else {
        initSwipeNavigation();
    }
}