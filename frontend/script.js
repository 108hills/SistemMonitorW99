
// GLOBAL DATA & SHARED LOGIC

let allNotifProducts = [];
let activeFilters = []; 
let base64Image = null; 
let editBase64Image = null;
let isDeleteMode = false;
let currentEditingProductId = null;
let currentDeletingProductId = null;

const BASE_URL = import.meta.env.VITE_BASE_URL

window.closeModals = function() {
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => overlay.style.display = 'none');
};

// LOGIN PAGE LOGIC

document.addEventListener('DOMContentLoaded', function() {
    const loginBtn = document.querySelector('.login-btn');
    const emailInput = document.querySelector('input[type="email"]');
    const passwordInput = document.getElementById('passwordInput');
    const togglePassword = document.getElementById('togglePassword');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            document.getElementById('eyeSlashIcon').style.display = type === 'text' ? 'none' : 'block';
            document.getElementById('eyeOpenIcon').style.display = type === 'text' ? 'block' : 'none';
        });
    }

    if (loginBtn && emailInput && passwordInput) {
        loginBtn.addEventListener('click', async function(event) {
            event.preventDefault(); 
            try {
                const response = await fetch('${BASE_URL}/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: emailInput.value, password: passwordInput.value })
                });
                const result = await response.json();
                if (result.status === "success") {
                    localStorage.setItem('loggedInUserId', result.user.id_user);
                    window.location.href = 'warkop99_dashboard.html';
                } else {
                    alert("Login failed: " + result.message);
                }
            } catch (error) {
                alert("Could not connect to the server.");
            }
        });
    }
});

// DASHBOARD PAGE LOGIC
window.toggleDeleteMode = function() {
    const productList = document.getElementById('productList');
    const menuSubtitle = document.getElementById('menuSubtitle');
    if (!productList || !menuSubtitle) return;
    isDeleteMode = !isDeleteMode;
    productList.classList.toggle('delete-mode-active', isDeleteMode);
    menuSubtitle.innerText = isDeleteMode ? "Dalam Mode Hapus!" : "Tekan untuk edit!";
    menuSubtitle.classList.toggle('red-text', isDeleteMode);
};

window.handleProductClick = function(id, name, stock, imageUrl) {
    if (isDeleteMode) return;
    currentEditingProductId = id; 
    editBase64Image = null;
    document.getElementById('editModalName').innerText = name;
    document.getElementById('editModalStock').innerText = stock;
    if (imageUrl) document.getElementById('editModalImg').style.background = `url('${imageUrl}') center/cover`;
    document.getElementById('editModal').style.display = 'flex';
};

window.openAddModal = function() {
    document.getElementById('addModal').style.display = 'flex';
};

window.openDeleteModal = function(id, name, imageUrl, event) {
    if (event) event.stopPropagation();
    currentDeletingProductId = id;
    document.getElementById('deleteModalName').innerText = name;
    if (imageUrl) document.getElementById('deleteModalImg').style.background = `url('${imageUrl}') center/cover`;
    document.getElementById('deleteModal').style.display = 'flex';
};

// API CALLS (DASHBOARD)
async function fetchProducts() {
    try {
        const response = await fetch('${BASE_URL}/api/products');
        const products = await response.json();
        const productList = document.getElementById('productList');
        if (!productList) return; 
        productList.innerHTML = ''; 
        products.forEach(product => {
            const displayImg = product.image_url || 'website_images/addimage.png';
            productList.innerHTML += `
                <div class="product-card" onclick="handleProductClick(${product.id_produk}, '${product.nama_produk}', ${product.stok}, '${displayImg}')">
                    <div class="product-img" style="background: url('${displayImg}') center/cover;"></div>
                    <div class="product-info">
                        <div class="info-box" style="justify-content: center;">${product.nama_produk}</div>
                        <div class="info-box"><span>STOK</span><span>${product.stok}</span></div>
                    </div>
                    <div class="card-trash-btn" onclick="openDeleteModal(${product.id_produk}, '${product.nama_produk}', '${displayImg}', event)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </div>
                </div>`;
        });
    } catch (error) { console.error("Error loading products:", error); }
}

window.saveStockToDatabase = async function() {
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

window.addProductToDatabase = async function() {
    const name = document.getElementById('addProductName').value;
    const stock = parseInt(document.getElementById('addProductStock').innerText);
    const userId = localStorage.getItem('loggedInUserId') || 1;
    if (!name.trim()) return alert("Nama produk tidak boleh kosong!");

    await fetch('${BASE_URL}/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_produk: name, stok: stock, image_url: base64Image, id_user: userId })
    });
    window.closeModals();
    fetchProducts();
};

window.deleteProductFromDatabase = async function() {
    const userId = localStorage.getItem('loggedInUserId') || 1;
    await fetch(`${BASE_URL}/api/products/${currentDeletingProductId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_user: userId })
    });
    window.closeModals();
    fetchProducts();
};

// NOTIFICATION PAGE LOGIC
let lowStockNotif = [];
let newProductNotif = [];

async function fetchNotifications() {
    try {
        const [lowStockRes, allProductsRes] = await Promise.all([
            fetch('${BASE_URL}/api/alerts/low-stock'),
            fetch('${BASE_URL}/api/products')
        ]);
        
        lowStockNotif = await lowStockRes.json();
        newProductNotif = await allProductsRes.json();
        
        renderNotifications(); 
    } catch (error) { 
        console.error("Kesalahan memuat notifikasi:", error); 
    }
}

window.renderNotifications = function() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    list.innerHTML = '';

    let stokRendahItems = lowStockNotif.map(p => ({...p, type: 'red'}));

    let produkBaruItems = [...newProductNotif]
        .sort((a,b) => b.id_produk - a.id_produk)
        .map(p => ({...p, type: 'blue'}));

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
            const badgeText = item.type === 'red' ? 'STOK RENDAH' : 'PRODUK BARU';
            
            list.innerHTML += `
                <div class="notif-card ${item.type}">
                    <div class="notif-img" style="background: url('${displayImg}') center/cover;"></div>
                    <div class="notif-content">
                        <div class="notif-badge">${badgeText}</div>
                        <div class="notif-text-row">
                            <span>NAMA</span>
                            <span>${item.nama_produk}</span>
                        </div>
                        <div class="notif-text-row">
                            <span>STOK</span>
                            <span>${item.stok}</span>
                        </div>
                    </div>
                </div>`;
        }
    });
};

window.switchNotifTab = function(tabName, element) {
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

// INITIALIZATION & SEARCH
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('productList')) fetchProducts();
    if (document.getElementById('notificationList')) fetchNotifications();

    // Dashboard Search
    document.getElementById('searchInput')?.addEventListener('input', e => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.product-card').forEach(card => {
            const name = card.querySelector('.info-box').innerText.toLowerCase();
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
        const reader = new FileReader();
        reader.onload = f => {
            base64Image = f.target.result;
            document.getElementById('previewImage').src = base64Image;
            document.getElementById('previewImage').style.display = 'block';
            document.getElementById('addImgPlus').style.display = 'none';
        };
        if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    });

    document.getElementById('editImageUpload')?.addEventListener('change', e => {
        const reader = new FileReader();
        reader.onload = f => {
            editBase64Image = f.target.result;
            document.getElementById('editModalImg').style.background = `url('${editBase64Image}') center/cover`;
        };
        if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    });

    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const span = this.parentElement.querySelector('span');
            let val = parseInt(span.innerText);
            span.innerText = this.innerText === '+' ? val + 1 : Math.max(0, val - 1);
        });
    });
});

// PROFILE & HISTORY LOGIc
async function fetchUserProfile() {
    const userId = localStorage.getItem('loggedInUserId');
    if (!userId) {
        window.location.href = 'index.html';
        return;
    }

    const nameElement = document.getElementById('loggedPegawaiName');
    const roleElement = document.getElementById('loggedPegawaiRole');
    const profileImg = document.getElementById('profileUserImg'); // NEW

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
    }
}

window.logoutAccount = async function() {
    const userId = localStorage.getItem('loggedInUserId');
    if (userId) {
        try {
            await fetch('${BASE_URL}/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_user: userId })
            });
        } catch (e) { console.error("Gagal logout di server:", e); }
    }
    localStorage.removeItem('loggedInUserId');
    window.location.href = 'index.html'; 
};

window.saveNewPassword = async function() {
    const passOld = document.getElementById('oldPassword').value;
    const pass1 = document.getElementById('newPassword').value;
    const pass2 = document.getElementById('verifyPassword').value;

    if (!passOld || !pass1 || pass1 !== pass2) {
        alert("Harap isi Password Lama, dan pastikan Password Baru cocok!");
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
            alert("Password berhasil diupdate!");
            closePasswordModal();
            document.getElementById('oldPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('verifyPassword').value = '';
        } else {
            alert(result.message || "Password lama tidak cocok.");
        }
    } catch (e) {
        console.error("Gagal save password:", e);
    }
};

window.showHistory = function() {
    document.getElementById('view-profile').classList.add('hidden');
    document.getElementById('view-history').classList.remove('hidden');
    window.renderDatabaseHistory(); 
};

window.showProfile = function() {
    document.getElementById('view-history').classList.add('hidden');
    document.getElementById('view-profile').classList.remove('hidden');
};

let databaseHistory = [];

window.renderDatabaseHistory = async function() {
    const list = document.getElementById('history-list');
    if (!list) return;
    try {
        const response = await fetch('${BASE_URL}/api/history');
        databaseHistory = await response.json();
        filterHistory('ALL', document.querySelector('#view-history .tab-btn')); 
    } catch (e) {
        console.error("Gagal load history:", e);
    }
};

window.filterHistory = function(filterType, element) {
    if (element) {
        document.querySelectorAll('#view-history .tab-btn').forEach(btn => {
            btn.classList.remove('active-blue');
            btn.style.background = '#ddd';
            btn.style.color = '#000';
        });
        element.classList.add('active-blue');
        element.style.background = '#33a1ff';
        element.style.color = '#fff';
    }

    const list = document.getElementById('history-list');
    list.innerHTML = '';
    let filtered = databaseHistory;
    
    if (filterType !== 'ALL') {
        filtered = databaseHistory.filter(h => h.jenis_transaksi.startsWith(filterType));
    }

    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center; font-weight:700; color:#999; margin:20px 0;">Belum ada riwayat untuk kategori ini.</p>';
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
            list.innerHTML += `
                <div class="menu-divider" style="margin: 15px 0;">
                    <span style="font-size: 0.8rem;">${currentDate}</span>
                </div>`;
            lastDate = currentDate;
        }

        const userAvatar = item.user_avatar || 'website_images/logo99.jpg';

        list.innerHTML += `
            <div style="background-color: #f5f5f5; border-radius: 15px; padding: 12px; display: flex; gap: 12px; margin-bottom: 15px; border-left: 5px solid ${badgeCol}; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <img src="${userAvatar}" style="width: 60px; height: 60px; border-radius: 12px; object-fit: cover;">
                <div style="flex: 1;">
                    <div style="color: ${badgeCol}; font-size: 0.8rem; font-weight: 900; margin-bottom: 8px;">
                        ${item.user_nama || 'User'}
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; gap: 4px;">
                        <span style="color: #666;">TIPE</span><span style="text-align: right;">${detailTipe}</span>
                        <span style="color: #666;">NAMA</span><span style="text-align: right;">${detailNama}</span>
                        <span style="color: #666;">STOK</span><span style="text-align: right;">${detailStok}</span>
                    </div>
                </div>
            </div>`;
    });
};

window.openPasswordModal = function() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.style.display = 'flex';
};

window.closePasswordModal = function() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('loggedPegawaiName')) fetchUserProfile();
});

// FUNGSI MODAL & NAVIGASI
window.openPasswordModal = function() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.style.display = 'flex';
};

window.closePasswordModal = function() {
    const modal = document.getElementById('passwordModal');
    if (modal) modal.style.display = 'none';
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
                
                if (!document.getElementById('view-history').classList.contains('hidden')) {
                    window.renderDatabaseHistory();
                }
            } catch (err) {
                console.error("Gagal save foto profil:", err);
            }
        }
    };
    reader.readAsDataURL(file);
});