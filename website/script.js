// =========================================
//         GLOBAL DATA & SHARED LOGIC
// =========================================
let allNotifProducts = [];
let activeFilters = []; 
let base64Image = null; 
let editBase64Image = null;
let isDeleteMode = false;
let currentEditingProductId = null;
let currentDeletingProductId = null;

window.closeModals = function() {
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(overlay => overlay.style.display = 'none');
};

// =========================================
//         LOGIN PAGE LOGIC
// =========================================
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
                const response = await fetch('http://localhost:5000/api/login', {
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

// =========================================
//         DASHBOARD PAGE LOGIC
// =========================================
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

// =========================================
//         API CALLS (DASHBOARD)
// =========================================
async function fetchProducts() {
    try {
        const response = await fetch('http://localhost:5000/api/products');
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

    await fetch(`http://localhost:5000/api/products/${currentEditingProductId}`, {
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

    await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_produk: name, stok: stock, image_url: base64Image, id_user: userId })
    });
    window.closeModals();
    fetchProducts();
};

window.deleteProductFromDatabase = async function() {
    const userId = localStorage.getItem('loggedInUserId') || 1;
    await fetch(`http://localhost:5000/api/products/${currentDeletingProductId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_user: userId })
    });
    window.closeModals();
    fetchProducts();
};

// =========================================
//         NOTIFICATION PAGE LOGIC
// =========================================
async function fetchNotifications() {
    try {
        const response = await fetch('http://localhost:5000/api/products');
        allNotifProducts = await response.json();
        renderNotifications(); 
    } catch (error) { console.error("Error loading notifications:", error); }
}

window.renderNotifications = function() {
    const list = document.getElementById('notificationList');
    if (!list) return;
    list.innerHTML = '';

    let stokRendahItems = allNotifProducts
        .filter(p => p.stok <= 5)
        .map(p => ({...p, type: 'red'}));

    let produkBaruItems = [...allNotifProducts]
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

// =========================================
//         INITIALIZATION & SEARCH
// =========================================
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