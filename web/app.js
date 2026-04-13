// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Stock Stepper Function (Plus/Minus buttons)
function updateStock(inputId, change) {
    const input = document.getElementById(inputId);
    let currentValue = parseInt(input.value);
    
    // Prevent negative stock
    if (currentValue + change >= 0) {
        input.value = currentValue + change;
    }
}

// Notification Tabs Function
function switchTab(clickedTab) {
    // Remove active class from all tabs
    const allTabs = document.querySelectorAll('.tab-btn');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.style.background = '#E0E0E0';
        tab.style.color = '#666';
    });

    // Add active class to clicked tab
    clickedTab.classList.add('active');
    
    // Change color based on tab name
    if(clickedTab.innerText === 'STOK RENDAH') {
        clickedTab.style.background = '#FF4D4D';
        clickedTab.style.color = 'white';
    } else if (clickedTab.innerText === 'PRODUK BARU') {
        clickedTab.style.background = '#3399FF';
        clickedTab.style.color = 'white';
    }
}

// Open Edit Modal Function
function openEditModal(productName) {
    document.getElementById('editModal').classList.add('active');
}

// Login Function
function handleLogin() {
    console.log("Login button clicked! Verifying credentials...");
    
    window.location.href = 'dashboard.html';
}