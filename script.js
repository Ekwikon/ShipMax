const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl2Xjj_C-AclApQ-sqjLdTulKGSFn3LwhyPpefpCltm04BwVXj6uuwa8ZTnvPp6I-G6Q/exec';

const DB_KEY_STOCK = 'ff_stock_data';
const DB_KEY_ORDERS = 'ff_orders_data';
const DB_KEY_USERS = 'ff_users_data';
const DB_KEY_AUTH = 'ff_logged_user';

const defaultUsers = [{ username: 'admin', password: '1234' }];
let usersList = JSON.parse(localStorage.getItem(DB_KEY_USERS)) || defaultUsers;
let currentStock = parseInt(localStorage.getItem(DB_KEY_STOCK)) || 150;
let ordersList = JSON.parse(localStorage.getItem(DB_KEY_ORDERS)) || [];
let stockProductsList = []; 

let userLat = 7.6167; 
let userLng = 100.0833;

let donutChartInstance = null;
let lineChartInstance = null;

// ======================================================
// 🌙 ☀️ DARK / LIGHT MODE SYSTEM (เพิ่มใหม่)
// ======================================================
function initTheme() {
    const savedTheme = localStorage.getItem('ff_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        document.documentElement.classList.add('dark');
        updateThemeIcons(true);
    } else {
        document.documentElement.classList.remove('dark');
        updateThemeIcons(false);
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('ff_theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');
    
    if (darkIcon && lightIcon) {
        if (isDark) {
            darkIcon.classList.add('hidden');
            lightIcon.classList.remove('hidden');
        } else {
            darkIcon.classList.remove('hidden');
            lightIcon.classList.add('hidden');
        }
    }
}

// Helper Function ดึง Username ของคนที่ล็อกอินปัจจุบัน
function getCurrentUser() {
    return localStorage.getItem(DB_KEY_AUTH) || '';
}

// ======================================================
// INITIALIZATION & SPA ROUTING
// ======================================================
window.addEventListener('DOMContentLoaded', () => {
    initTheme(); // เรียกใช้อัปเดตโหมดมืด-สว่างทันทีเมื่อเปิดหน้า
    checkAuthStatus();
});

async function switchPage(page) {
    const pages = ['dashboard', 'address', 'finance', 'map', 'tracking'];
    pages.forEach(p => {
        const btn = document.getElementById(`nav-${p}`);
        if (btn) btn.className = "w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white px-4 py-3 rounded-lg transition text-left text-sm";
    });

    const activeBtn = document.getElementById(`nav-${page}`);
    if (activeBtn) activeBtn.className = "w-full flex items-center gap-3 bg-emerald-500/10 text-emerald-400 px-4 py-3 rounded-lg font-medium text-left text-sm";

    try {
        const res = await fetch(`pages/${page}.html`);
        const html = await res.text();
        const contentArea = document.getElementById('content-area');
        if (contentArea) contentArea.innerHTML = html;

        if (page === 'dashboard') {
            fetchStockFromGoogleSheet();
        } else if (page === 'finance') {
            fetchDataFromGoogleSheet();
        } else if (page === 'map') {
            updateMapByGPS();
        }
    } catch (err) {
        console.error("โหลดหน้าย่อยไม่สำเร็จ:", err);
    }
}

// ======================================================
// RESPONSIVE SIDEBAR MOBILE FUNCTIONS
// ======================================================
function toggleMobileMenu() {
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop') || document.getElementById('sidebar-backdrop');
    
    if (sidebar) {
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            if (backdrop) backdrop.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            if (backdrop) backdrop.classList.add('hidden');
        }
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('main-sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop') || document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
}

// ======================================================
// AUTHENTICATION SYSTEM
// ======================================================
function toggleAuthForm(target) {
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');
    if (target === 'register') {
        if (loginBox) loginBox.classList.add('hidden');
        if (registerBox) registerBox.classList.remove('hidden');
    } else {
        if (registerBox) registerBox.classList.add('hidden');
        if (loginBox) loginBox.classList.remove('hidden');
    }
}

async function handleRegister(e) {
    if (e) e.preventDefault();
    const userEl = document.getElementById('reg-username');
    const passEl = document.getElementById('reg-password');
    const confirmPassEl = document.getElementById('reg-confirm-password');

    if (!userEl || !passEl) return;

    const user = userEl.value.trim();
    const pass = passEl.value;
    const confirmPass = confirmPassEl ? confirmPassEl.value : '';

    if (confirmPass && pass !== confirmPass) {
        alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน!');
        return;
    }

    if (usersList.some(u => u.username.toLowerCase() === user.toLowerCase())) {
        alert('ชื่อผู้ใช้งานนี้ถูกใช้ไปแล้ว กรุณาใช้ชื่ออื่น');
        return;
    }

    const regBtn = document.getElementById('reg-submit-btn');
    if (regBtn) {
        regBtn.innerText = "⏳ กำลังสมัครสมาชิก...";
        regBtn.disabled = true;
    }

    usersList.push({ username: user, password: pass });
    localStorage.setItem(DB_KEY_USERS, JSON.stringify(usersList));

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'register', action: 'register', username: user, password: pass })
        });
    } catch (err) {
        console.error("ส่งข้อมูลสมาชิกลง Google Sheet ไม่สำเร็จ:", err);
    }

    if (regBtn) {
        regBtn.innerText = "📝 ยืนยันการสมัครสมาชิก";
        regBtn.disabled = false;
    }

    alert('🎉 สมัครสมาชิกสำเร็จ! กรุณาล็อกอินเข้าสู่ระบบ');
    toggleAuthForm('login');
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    const userEl = document.getElementById('login-username');
    const passEl = document.getElementById('login-password');
    if (!userEl || !passEl) return;

    const user = userEl.value.trim();
    const pass = passEl.value;
    const loginBtn = document.querySelector('#login-box button[type="submit"]') || document.querySelector('#login-box button');

    if (loginBtn) {
        loginBtn.innerText = "⏳ กำลังเข้าสู่ระบบ...";
        loginBtn.disabled = true;
    }

    let isSuccess = false;
    let loggedUsername = user;

    // 1. ลองยิงไปตรวจสอบ Login กับ Google Apps Script ก่อน
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=login&username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
        if (response.ok) {
            const resData = await response.json();
            if (resData.status === 'success') {
                isSuccess = true;
                loggedUsername = resData.username || user;
            }
        }
    } catch (err) {
        console.warn("ไม่สามารถเช็กรหัสผ่านผ่าน Google Sheet ได้ ใช้ข้อมูลสำรองในเครื่องแทน:", err);
    }

    // 2. ถ้าออนไลน์เช็กไม่ผ่าน ให้ fallback มาเช็กใน LocalStorage สำรอง
    if (!isSuccess) {
        const foundUser = usersList.find(u => u.username.toLowerCase() === user.toLowerCase() && u.password === pass);
        if (foundUser) {
            isSuccess = true;
            loggedUsername = foundUser.username;
        }
    }

    // คืนค่าปุ่ม
    if (loginBtn) {
        loginBtn.innerHTML = "🔑 เข้าสู่ระบบ";
        loginBtn.disabled = false;
    }

    // 3. สรุปผลการล็อกอิน
    if (isSuccess) {
        localStorage.setItem(DB_KEY_AUTH, loggedUsername);
        
        const nameDisplay = document.getElementById('user-display-name');
        if (nameDisplay) nameDisplay.innerText = loggedUsername;

        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.classList.add('hidden');

        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) sidebar.classList.remove('hidden');

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.remove('hidden');
            mainContent.classList.add('flex');
        }

        const aiBtn = document.getElementById('ai-chat-btn');
        if (aiBtn) aiBtn.classList.remove('hidden');

        switchPage('dashboard');
    } else {
        alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
    }
}

function handleLogout() {
    localStorage.removeItem(DB_KEY_AUTH);

    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.classList.remove('hidden');

    const sidebar = document.getElementById('main-sidebar');
    if (sidebar) sidebar.classList.add('hidden');
    closeMobileMenu();

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.classList.add('hidden');
        mainContent.classList.remove('flex');
    }

    const aiBtn = document.getElementById('ai-chat-btn');
    if (aiBtn) aiBtn.classList.add('hidden');

    const aiModal = document.getElementById('ai-chat-modal');
    if (aiModal) aiModal.classList.add('hidden');

    const userInp = document.getElementById('login-username');
    const passInp = document.getElementById('login-password');
    if (userInp) userInp.value = '';
    if (passInp) passInp.value = '';
}

function checkAuthStatus() {
    const loggedUser = getCurrentUser();
    if (loggedUser) {
        const nameDisplay = document.getElementById('user-display-name');
        if (nameDisplay) nameDisplay.innerText = loggedUser;

        const loginOverlay = document.getElementById('login-overlay');
        if (loginOverlay) loginOverlay.classList.add('hidden');

        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) sidebar.classList.remove('hidden');

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.remove('hidden');
            mainContent.classList.add('flex');
        }

        const aiBtn = document.getElementById('ai-chat-btn');
        if (aiBtn) aiBtn.classList.remove('hidden');

        switchPage('dashboard');
    } else {
        handleLogout();
    }
}

// ======================================================
// STOCK MANAGEMENT
// ======================================================
async function fetchStockFromGoogleSheet() {
    const currentUser = getCurrentUser();
    const tbody = document.getElementById('stock-table-body');
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">กำลังโหลดข้อมูลสินค้า...</td></tr>`;

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStock&username=${encodeURIComponent(currentUser)}`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                stockProductsList = data;
                renderStockTable();
                return;
            }
        }
    } catch (err) {
        console.error("ไม่สามารถโหลดสต็อกได้:", err);
    }
    
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500">ไม่สามารถดึงข้อมูลสต็อกได้</td></tr>`;
}

function renderStockTable() {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    let totalStockQty = 0;
    let lowStockAlertCount = 0;

    if (stockProductsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">ไม่มีข้อมูลสินค้าในระบบ</td></tr>`;
    } else {
        stockProductsList.forEach(p => {
            const qty = Number(p.quantity) || 0;
            const minAlert = Number(p.minAlert) || 5;
            totalStockQty += qty;

            const isLow = qty <= minAlert;
            if (isLow) lowStockAlertCount++;

            const row = tbody.insertRow();
           row.className = "hover:bg-emerald-500/10 border-b border-emerald-500/30 font-medium text-xs transition-colors";
            row.innerHTML = `
                <td class="p-3 font-bold text-slate-700 dark:text-slate-300">${p.sku || '-'}</td>
                <td class="p-3 text-slate-900 dark:text-slate-100">${p.productName || '-'}</td>
                <td class="p-3 text-slate-500 dark:text-slate-400">${Number(p.costPrice || 0).toLocaleString()} บ.</td>
                <td class="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">${Number(p.sellingPrice || 0).toLocaleString()} บ.</td>
                <td class="p-3 font-bold ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}">${qty.toLocaleString()} ชิ้น</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${isLow ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'}">
                        ${isLow ? '⚠️ สต็อกต่ำ' : 'พร้อมส่ง'}
                    </span>
                </td>
            `;
        });
    }

    currentStock = totalStockQty;
    localStorage.setItem(DB_KEY_STOCK, currentStock.toString());

    if (document.getElementById('home-total-stock')) document.getElementById('home-total-stock').innerText = totalStockQty.toLocaleString();
    if (document.getElementById('home-item-count')) document.getElementById('home-item-count').innerText = stockProductsList.length;
    if (document.getElementById('home-low-stock-count')) document.getElementById('home-low-stock-count').innerText = lowStockAlertCount;
}

async function handleAddNewProduct(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('btn-save-prod');
    if (saveBtn) {
        saveBtn.innerText = "⏳ กำลังบันทึก...";
        saveBtn.disabled = true;
    }

    const newProd = {
        action: "addProduct",
        sku: document.getElementById('p-sku').value,
        productName: document.getElementById('p-name').value,
        costPrice: Number(document.getElementById('p-cost').value),
        sellingPrice: Number(document.getElementById('p-sell').value),
        quantity: Number(document.getElementById('p-qty').value),
        minAlert: Number(document.getElementById('p-min').value),
        username: getCurrentUser()
    };

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProd)
        });

        alert("เพิ่มสินค้าใหม่ลง Google Sheet เรียบร้อยครับ!");
        document.getElementById('add-product-form').reset();
        document.getElementById('add-product-modal').classList.add('hidden');
        
        setTimeout(fetchStockFromGoogleSheet, 1000);
    } catch (err) {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า");
        console.error(err);
    } finally {
        if (saveBtn) {
            saveBtn.innerText = "💾 บันทึกลง Sheet";
            saveBtn.disabled = false;
        }
    }
}

// ======================================================
// GOOGLE SHEET SYNC & FINANCE
// ======================================================
async function fetchDataFromGoogleSheet() {
    const currentUser = getCurrentUser();
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOrders&username=${encodeURIComponent(currentUser)}`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                ordersList = data.map(item => ({
                    name: item.name || item.Name || '-',
                    courier: item.courier || item.Courier || '-',
                    sellingPrice: parseFloat(item.sellingPrice || item.SellingPrice || 0),
                    productCost: parseFloat(item.productCost || item.ProductCost || 0),
                    shippingPrice: parseFloat(item.shippingPrice || item.ShippingPrice || 0),
                    netProfit: parseFloat(item.netProfit || item.NetProfit || 0),
                    margin: parseFloat(item.margin || item.Margin || 0)
                }));
                localStorage.setItem(DB_KEY_ORDERS, JSON.stringify(ordersList));
            }
        }
    } catch (err) {
        console.log("ใช้งานข้อมูลจาก LocalStorage สำรอง:", err);
    } finally {
        loadDashboardAndFinanceData();
    }
}

function loadDashboardAndFinanceData() {
    const stockEl = document.getElementById('total-stock-display');
    const orderEl = document.getElementById('order-count-display');
    if (stockEl) stockEl.innerText = `${currentStock} ชิ้น`;
    if (orderEl) orderEl.innerText = `${ordersList.length} ออเดอร์`;

    let rev = 0, cost = 0, ship = 0;
    const finTable = document.getElementById('finance-table-body');

    if (finTable) {
        finTable.innerHTML = '';
        if (ordersList.length === 0) {
            finTable.innerHTML = `<tr class="text-slate-400" id="fin-empty-row"><td colspan="7" class="p-4 text-center">ยังไม่มีข้อมูลรายการขายและกำไรในขณะนี้</td></tr>`;
        } else {
            ordersList.forEach(item => {
                const itemRev = Number(item.sellingPrice) || 0;
                const itemCost = Number(item.productCost) || 0;
                const itemShip = Number(item.shippingPrice) || 0;
                const itemProfit = Number(item.netProfit) || (itemRev - itemCost - itemShip);
                const itemMargin = itemRev > 0 ? ((itemProfit / itemRev) * 100).toFixed(1) : (item.margin || 0);

                rev += itemRev;
                cost += itemCost;
                ship += itemShip;

                const row = finTable.insertRow();
                row.className = "border-b border-slate-100 dark:border-slate-800 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition";
                row.innerHTML = `
                    <td class="p-3 font-bold text-slate-800 dark:text-slate-200">${item.name || '-'}</td>
                    <td class="p-3 text-slate-600 dark:text-slate-400">${item.courier || '-'}</td>
                    <td class="p-3 text-slate-700 dark:text-slate-300 font-semibold">${itemRev.toLocaleString()} บ.</td>
                    <td class="p-3 text-rose-500">${itemCost.toLocaleString()} บ.</td>
                    <td class="p-3 text-amber-600">${itemShip.toLocaleString()} บ.</td>
                    <td class="p-3 font-bold ${itemProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${itemProfit.toLocaleString()} บ.</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${itemProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'}">${itemMargin}%</span></td>
                `;
            });
        }
    }

    const netProfitTotal = rev - cost - ship;

    if (document.getElementById('fin-total-revenue')) document.getElementById('fin-total-revenue').innerText = rev.toLocaleString();
    if (document.getElementById('fin-total-cost')) document.getElementById('fin-total-cost').innerText = cost.toLocaleString();
    if (document.getElementById('fin-total-shipping')) document.getElementById('fin-total-shipping').innerText = ship.toLocaleString();
    if (document.getElementById('fin-net-profit')) document.getElementById('fin-net-profit').innerText = netProfitTotal.toLocaleString();

    setTimeout(() => {
        renderFinanceCharts(cost, ship, netProfitTotal);
    }, 150);
}

function renderFinanceCharts(cost, shipping, profit) {
    const donutCtx = document.getElementById('financeDonutChart');
    const lineCtx = document.getElementById('financeLineChart') || document.getElementById('financeBarChart');

    if (!donutCtx || !lineCtx || typeof Chart === 'undefined') return;

    if (donutChartInstance) donutChartInstance.destroy();
    if (lineChartInstance) lineChartInstance.destroy();

    donutChartInstance = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: ['ต้นทุนสินค้า', 'ค่าจัดส่ง', 'กำไรสุทธิ'],
            datasets: [{
                data: [cost, shipping, profit > 0 ? profit : 0],
                backgroundColor: ['#f43f5e', '#f59e0b', '#10b981'],
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Prompt', size: 11 } } }
            }
        }
    });

    const labels = ordersList.map((o, idx) => o.name || `ออเดอร์ ${idx + 1}`);
    const revenues = ordersList.map(o => Number(o.sellingPrice) || 0);
    const profits = ordersList.map(o => Number(o.netProfit) || (Number(o.sellingPrice || 0) - Number(o.productCost || 0) - Number(o.shippingPrice || 0)));

    lineChartInstance = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['ไม่มีข้อมูล'],
            datasets: [
                {
                    label: 'ยอดขาย (บาท)',
                    data: revenues.length > 0 ? revenues : [0],
                    borderColor: '#374151',
                    backgroundColor: '#374151',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.1
                },
                {
                    label: 'กำไรสุทธิ (บาท)',
                    data: profits.length > 0 ? profits : [0],
                    borderColor: '#EF4444',
                    backgroundColor: '#EF4444',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Prompt', size: 11 } } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { font: { family: 'Prompt', size: 10 } }, grid: { color: '#F1F5F9' } },
                x: { ticks: { font: { family: 'Prompt', size: 10 } }, grid: { color: '#F1F5F9' } }
            }
        }
    });
}

function clearDatabase() {
    if(confirm("คุณต้องการล้างข้อมูลบันทึกในเครื่องใช่หรือไม่?")) {
        localStorage.removeItem(DB_KEY_ORDERS);
        ordersList = [];
        loadDashboardAndFinanceData();
    }
}

function filterFinanceTable() {
    const input = document.getElementById('fin-search-input');
    if (!input) return;
    const filter = input.value.toLowerCase();
    const rows = document.querySelectorAll('#finance-table-body tr');
    
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
    });
}

// ======================================================
// AI ADDRESS PROCESSING & PRINT
// ======================================================
async function processAddressAndShipping() {
    const apiKey = document.getElementById('gemini-key-input').value.trim();
    const rawText = document.getElementById('raw-address-input').value.trim();
    const weight = document.getElementById('weight-input').value.trim();
    
    if (!apiKey || !rawText || !weight) { alert("กรุณากรอกข้อมูลให้ครบถ้วนครับ"); return; }

    document.getElementById('btn-text').innerText = "AI กำลังวิเคราะห์ต้นทุนค่าส่ง...";
    document.getElementById('loading-spinner').classList.remove('hidden');

    const promptText = `Extract the following Thai address text into a JSON object and calculate the best courier price.
Text to extract: "${rawText}"
The package weight is ${weight} kg.
Pricing Rules:
1. Flash Express: Base 22 THB (for < 1kg). Each additional kg is +10 THB. Remote area surcharge is +50 THB.
2. J&T Express: Base 25 THB (for < 1kg). Each additional kg is +8 THB. Remote area surcharge is +50 THB.
3. ไปรษณีย์ไทย (EMS): Base 32 THB (for < 1kg). Each additional kg is +15 THB. NO remote area surcharge (0 THB).
*Remote areas are zip codes starting with 58, 95, 96, 94.

Compare Flash, J&T, and ไปรษณีย์ไทย. Choose the lowest cost option.
Respond ONLY with a valid JSON object matching this structure:
{
    "name": "ชื่อผู้รับ",
    "phone": "เบอร์โทร",
    "address1": "บ้านเลขที่ หมู่ ซอย ถนน คอนโด",
    "subdistrict": "ตำบล/แขวง",
    "district": "อำเภอ/เขต",
    "province": "จังหวัด",
    "zipcode": "รหัสไปรษณีย์",
    "courier": "ชื่อขนส่งที่ราคาถูกที่สุด",
    "price": "ตัวเลขราคาที่คำนวณได้ต่ำที่สุด",
    "reason": "เหตุผลสั้นๆ (ภาษาไทย)"
}`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })
        });

        const data = await response.json();
        if (data.error) { alert("Error: " + data.error.message); return; }

        let jsonText = data.candidates[0].content.parts[0].text;
        jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(jsonText);
        
        document.getElementById('out-name').value = result.name || '';
        document.getElementById('out-phone').value = result.phone || '';
        document.getElementById('out-address1').value = result.address1 || '';
        document.getElementById('out-subdistrict').value = result.subdistrict || '';
        document.getElementById('out-district').value = result.district || '';
        document.getElementById('out-province').value = result.province || '';
        document.getElementById('out-zipcode').value = result.zipcode || '';
        
        document.getElementById('out-courier').innerText = result.courier || '-';
        document.getElementById('out-price').innerText = result.price || '0';
        document.getElementById('out-reason').innerText = `*เหตุผล: ${result.reason || ''}`;

        document.getElementById('status-badge').className = "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-medium";
        document.getElementById('status-badge').innerText = "✓ วิเคราะห์ต้นทุนค่าส่งเสร็จสิ้น";
    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาดในการคำนวณ ลองใหม่อีกครั้งครับ");
    } finally {
        document.getElementById('btn-text').innerText = "✨ สั่ง AI จัดเรียงที่อยู่ + หาค่าส่งถูกที่สุด";
        document.getElementById('loading-spinner').classList.add('hidden');
    }
}

async function printLabel() {
    const name = document.getElementById('out-name').value;
    const courier = document.getElementById('out-courier').innerText;
    const shippingPrice = parseFloat(document.getElementById('out-price').innerText) || 0;
    const sellingPrice = parseFloat(document.getElementById('selling-price-input').value) || 0;
    const productCost = parseFloat(document.getElementById('product-cost-input').value) || 0;

    if(!name || courier === '-') { alert("กรุณาให้ AI สกัดที่อยู่ให้สำเร็จก่อนสั่งพิมพ์ครับ"); return; }

    const netProfit = sellingPrice - productCost - shippingPrice;
    const margin = sellingPrice > 0 ? ((netProfit / sellingPrice) * 100).toFixed(1) : 0;

    const orderData = {
        type: 'order',
        id: Date.now(),
        name: name,
        courier: courier,
        sellingPrice: sellingPrice,
        productCost: productCost,
        shippingPrice: shippingPrice,
        netProfit: netProfit,
        margin: margin,
        username: getCurrentUser()
    };

    const printBtn = document.getElementById('btn-print-save');
    printBtn.innerHTML = "⏳ กำลังบันทึกลง Google Sheet...";
    printBtn.disabled = true;

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
    } catch (err) {
        console.error("ส่ง Google Sheet ไม่สำเร็จ บันทึกลงเครื่องแทน:", err);
    }

    ordersList.push(orderData);
    currentStock -= 1;

    localStorage.setItem(DB_KEY_ORDERS, JSON.stringify(ordersList));
    localStorage.setItem(DB_KEY_STOCK, currentStock.toString());

    loadDashboardAndFinanceData();

    printBtn.innerHTML = "🖨️ พิมพ์ใบปะหน้า + บันทึกบัญชี";
    printBtn.disabled = false;

    alert(`🖨️ สั่งพิมพ์ใบปะหน้าสำเร็จ!\n📊 บันทึกข้อมูลเข้าสู่ Google Sheet เรียบร้อยครับ\n💰 ยอดขาย: ${sellingPrice} บาท | กำไรสุทธิ: ${netProfit} บาท`);
}

function copyToClipboard() {
    const name = document.getElementById('out-name').value;
    const phone = document.getElementById('out-phone').value;
    const addr = document.getElementById('out-address1').value;
    const sub = document.getElementById('out-subdistrict').value;
    const dist = document.getElementById('out-district').value;
    const prov = document.getElementById('out-province').value;
    const zip = document.getElementById('out-zipcode').value;

    if(!name) { alert("ไม่มีข้อมูลที่อยู่ให้คัดลอกครับ"); return; }
    const fullText = `ผู้รับ: ${name}\nโทร: ${phone}\nที่อยู่: ${addr} ต.${sub} อ.${dist} จ.${prov} ${zip}`;
    navigator.clipboard.writeText(fullText);
    alert("📋 คัดลอกที่อยู่เรียบร้อยครับ!");
}

// ======================================================
// MAP & TRACKING FUNCTIONS
// ======================================================
function toggleDropdown() {
    const menu = document.getElementById('courier-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
}

function selectCourier(val, imgPath, name) {
    document.getElementById('selected-courier-val').value = val;
    document.getElementById('selected-courier-display').innerHTML = `
        <img src="${imgPath}" class="w-6 h-6 object-contain rounded" alt="${name}">
        <span class="truncate">${name}</span>
    `;
    document.getElementById('courier-dropdown-menu').classList.add('hidden');
}

function trackParcelSimulated() {
    const trackNum = document.getElementById('tracking-input').value.trim();
    const courierDisplay = document.getElementById('selected-courier-display').innerHTML;
    if(!trackNum) { alert("กรุณากรอกเลขพัสดุก่อนครับ"); return; }
    document.getElementById('res-tracking-num').innerText = trackNum.toUpperCase();
    document.getElementById('res-courier-name').innerHTML = courierDisplay;
    document.getElementById('tracking-result-box').classList.remove('hidden');
}

function openOfficialTracking() {
    const trackNum = document.getElementById('tracking-input').value.trim();
    const courier = document.getElementById('selected-courier-val').value;
    let targetUrl = "";
    if(courier === 'flash') targetUrl = `https://www.flashexpress.co.th/tracking/?se=${trackNum}`;
    else if(courier === 'jnt') targetUrl = `https://www.jtexpress.co.th/index/query/gzquery.html?bill_code=${trackNum}`;
    else if(courier === 'thailandpost') targetUrl = `https://track.thailandpost.co.th/?trackNumber=${trackNum}`;
    else if(courier === 'kerry') targetUrl = `https://th.kex-express.com/th/track/?track=${trackNum}`;
    window.open(targetUrl, '_blank');
}

function updateMapByGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            const searchQuery = encodeURIComponent("Express, ไปรษณีย์ไทย");
            const mapFrame = document.getElementById('google-maps-frame');
            if (mapFrame) mapFrame.src = `https://maps.google.com/maps?q=${searchQuery}&ll=${userLat},${userLng}&z=13&ie=UTF8&iwloc=&output=embed`;
            if (document.getElementById('map-status-text')) {
                document.getElementById('map-status-text').innerText = `✅ ดึงตำแหน่งปัจจุบัน (${userLat.toFixed(4)}, ${userLng.toFixed(4)}) แสดงหมุดขนส่งเรียบร้อยแล้ว`;
            }
        });
    }
}

function openExternalGoogleMaps() {
    window.open(`https://www.google.com/maps/search/ขนส่ง+ไปรษณีย์+Flash+J%26T+Kerry/@${userLat},${userLng},13z`, '_blank');
}

// ======================================================
// AI CHATBOT & VOICE ASSISTANT
// ======================================================
let isListening = false;
let recognition = null;

function toggleChatModal() {
    const chatModal = document.getElementById('ai-chat-modal');
    if (chatModal) chatModal.classList.toggle('hidden');
}

function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendChatMessage();
}

async function sendChatMessage() {
    const inputField = document.getElementById('chat-input');
    const userMessage = inputField.value.trim();
    const apiKeyInput = document.getElementById('gemini-key-input');
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';

    if (!userMessage) return;
    if (!apiKey) {
        alert("กรุณากรอก Gemini API Key ในหน้า 'AI คัดแยกที่อยู่' ก่อนใช้งานแชทครับ!");
        return;
    }

    appendMessage(userMessage, 'user');
    inputField.value = '';

    const loadingElem = appendMessage("กำลังคิดคำตอบ...", 'ai-loading');

    const systemPrompt = `คุณคือ "ShipMax Assistant" ผู้ช่วยประจำระบบจัดการคลังสินค้า คำนวณค่าจัดส่ง และสรุปบัญชีต้นทุน-กำไร 
1. คุณเป็นผู้ชาย ให้พูดจาสุภาพ และใช้คำลงท้ายว่า "ครับ" เท่านั้น ห้ามใช้คำว่า "ค่ะ" หรือ "ครับ/ค่ะ" โดยเด็ดขาด
2. ตอบเฉพาะคำถามที่เกี่ยวข้องกับระบบ ShipMax นี้เท่านั้น
3. ผู้ใช้งานปัจจุบัน: ${getCurrentUser()}
4. สต็อกปัจจุบัน: ${currentStock} ชิ้น, ออเดอร์ทั้งหมด: ${ordersList.length} รายการ
5. ขนส่งที่รองรับ: Flash, J&T, ไปรษณีย์ไทย, KEX
6. หากถามเรื่องอื่น ให้ปฏิเสธอย่างสุภาพ`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nคำถามจากผู้ใช้: ${userMessage}` }] }]
            })
        });

        const data = await response.json();

        if (loadingElem && loadingElem.parentNode) {
            loadingElem.parentNode.removeChild(loadingElem);
        }

        if (data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text) {
            const aiReply = data.candidates[0].content.parts[0].text;
            appendMessage(aiReply, 'ai');
            speakText(aiReply);
        } else {
            appendMessage("ขออภัยครับ ไม่สามารถดึงคำตอบได้ กรุณาลองใหม่อีกครั้ง", 'ai');
        }
    } catch (err) {
        console.error("Chat Error:", err);
        if (loadingElem && loadingElem.parentNode) {
            loadingElem.parentNode.removeChild(loadingElem);
        }
        appendMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI ครับ", 'ai');
    }
}

function appendMessage(text, sender) {
    const chatContainer = document.getElementById('chat-messages');
    if (!chatContainer) return null;

    const msgDiv = document.createElement('div');

    if (sender === 'user') {
        msgDiv.className = "bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 font-medium p-3 rounded-xl rounded-tr-none max-w-[85%] ml-auto shadow-sm text-xs";
        msgDiv.innerText = text;
    } else if (sender === 'ai') {
        msgDiv.className = "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-950 dark:text-emerald-200 p-3 rounded-xl rounded-tl-none max-w-[85%] shadow-sm text-xs leading-relaxed space-y-1";
        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
        msgDiv.innerHTML = formattedText;
    } else {
        msgDiv.className = "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 p-3 rounded-xl rounded-tl-none max-w-[85%] animate-pulse text-xs";
        msgDiv.innerText = text;
    }

    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return msgDiv;
}

function speakText(text) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    let cleanText = text
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*/g, '')
        .replace(/#/g, '')
        .replace(/[\*\-\_]/g, '')
        .replace(/\n+/g, ' ')
        .trim();

    if (!cleanText) return;

    const playSpeech = () => {
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('th'))
                       || voices.find(v => v.lang.includes('th') || v.name.toLowerCase().includes('thai'));

        const utterance = new SpeechSynthesisUtterance(cleanText);

        if (thaiVoice) utterance.voice = thaiVoice;
        utterance.lang = 'th-TH';
        utterance.rate = 0.80;
        utterance.pitch = 0.95;

        window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length > 0) {
        playSpeech();
    } else {
        window.speechSynthesis.onvoiceschanged = playSpeech;
    }
}

function toggleVoiceRecognition() {
    const micBtn = document.getElementById('btn-mic');
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("เบราว์เซอร์นี้ไม่รองรับระบบสั่งงานด้วยเสียงครับ (แนะนำให้ใช้ Google Chrome)");
        return;
    }

    if (isListening) {
        if (recognition) recognition.stop();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';

    recognition.onstart = function() {
        isListening = true;
        if (micBtn) micBtn.className = "p-2.5 bg-rose-500 text-white rounded-xl transition text-base animate-bounce";
    };

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        const chatInp = document.getElementById('chat-input');
        if (chatInp) chatInp.value = transcript;
        sendChatMessage();
    };

    recognition.onend = function() {
        isListening = false;
        if (micBtn) micBtn.className = "p-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-rose-100 text-slate-700 dark:text-slate-200 hover:text-rose-600 rounded-xl transition text-base";
    };

    recognition.start();
}
