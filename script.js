const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl2Xjj_C-AclApQ-sqjLdTulKGSFn3LwhyPpefpCltm04BwVXj6uuwa8ZTnvPp6I-G6Q/exec';[cite: 1]

const DB_KEY_STOCK = 'ff_stock_data';[cite: 1]
const DB_KEY_ORDERS = 'ff_orders_data';[cite: 1]
const DB_KEY_USERS = 'ff_users_data';[cite: 1]
const DB_KEY_AUTH = 'ff_logged_user';[cite: 1]

const defaultUsers = [{ username: 'admin', password: '1234' }];[cite: 1]
let usersList = JSON.parse(localStorage.getItem(DB_KEY_USERS)) || defaultUsers;[cite: 1]
let currentStock = parseInt(localStorage.getItem(DB_KEY_STOCK)) || 150;[cite: 1]
let ordersList = JSON.parse(localStorage.getItem(DB_KEY_ORDERS)) || [];[cite: 1]
let stockProductsList = []; // ข้อมูลสต็อกรายชิ้นจาก Google Sheet (Sheet: Stock)[cite: 1]

let userLat = 7.6167;[cite: 1]
let userLng = 100.0833;[cite: 1]

let donutChartInstance = null;[cite: 1]
let lineChartInstance = null;[cite: 1]

// ======================================================
// INITIALIZATION & SPA ROUTING
// ======================================================
window.addEventListener('DOMContentLoaded', () => {[cite: 1]
    checkAuthStatus();[cite: 1]
});

async function switchPage(page) {[cite: 1]
    const pages = ['dashboard', 'address', 'finance', 'map', 'tracking'];[cite: 1]
    pages.forEach(p => {[cite: 1]
        const btn = document.getElementById(`nav-${p}`);[cite: 1]
        if (btn) btn.className = "w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white px-4 py-3 rounded-lg transition text-left";[cite: 1]
    });

    const activeBtn = document.getElementById(`nav-${page}`);[cite: 1]
    if (activeBtn) activeBtn.className = "w-full flex items-center gap-3 bg-emerald-500/10 text-emerald-400 px-4 py-3 rounded-lg font-medium text-left";[cite: 1]

    try {[cite: 1]
        const res = await fetch(`pages/${page}.html`);[cite: 1]
        const html = await res.text();[cite: 1]
        document.getElementById('content-area').innerHTML = html;[cite: 1]

        if (page === 'dashboard') {[cite: 1]
            fetchStockFromGoogleSheet();[cite: 1]
        } else if (page === 'finance') {[cite: 1]
            fetchDataFromGoogleSheet();[cite: 1]
        } else if (page === 'map') {[cite: 1]
            updateMapByGPS();[cite: 1]
        }
    } catch (err) {[cite: 1]
        console.error("โหลดหน้าย่อยไม่สำเร็จ:", err);[cite: 1]
    }
}

// ======================================================
// STOCK MANAGEMENT (เชื่อมต่อชีต "Stock")
// ======================================================
async function fetchStockFromGoogleSheet() {[cite: 1]
    const tbody = document.getElementById('stock-table-body');[cite: 1]
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">กำลังโหลดข้อมูลสินค้าจาก Google Sheet...</td></tr>`;[cite: 1]

    try {[cite: 1]
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getStock`);[cite: 1]
        if (response.ok) {[cite: 1]
            const data = await response.json();[cite: 1]
            if (Array.isArray(data)) {[cite: 1]
                stockProductsList = data;[cite: 1]
                renderStockTable();[cite: 1]
                return;[cite: 1]
            }
        }
    } catch (err) {[cite: 1]
        console.error("ไม่สามารถโหลดสต็อกได้:", err);[cite: 1]
    }
    
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500">ไม่สามารถดึงข้อมูลสต็อกได้</td></tr>`;[cite: 1]
}

function renderStockTable() {[cite: 1]
    const tbody = document.getElementById('stock-table-body');[cite: 1]
    if (!tbody) return;[cite: 1]

    tbody.innerHTML = '';[cite: 1]
    let totalStockQty = 0;[cite: 1]
    let lowStockAlertCount = 0;[cite: 1]

    if (stockProductsList.length === 0) {[cite: 1]
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400">ไม่มีข้อมูลสินค้าในระบบ</td></tr>`;[cite: 1]
    } else {
        stockProductsList.forEach(p => {[cite: 1]
            const qty = Number(p.quantity) || 0;[cite: 1]
            const minAlert = Number(p.minAlert) || 5;[cite: 1]
            totalStockQty += qty;[cite: 1]

            const isLow = qty <= minAlert;[cite: 1]
            if (isLow) lowStockAlertCount++;[cite: 1]

            const row = tbody.insertRow();[cite: 1]
            row.className = "hover:bg-slate-50 border-b border-slate-100 font-medium text-xs";[cite: 1]
            row.innerHTML = `
                <td class="p-3 font-bold text-slate-700">${p.sku || '-'}</td>
                <td class="p-3 text-slate-900">${p.productName || '-'}</td>
                <td class="p-3 text-slate-500">${Number(p.costPrice || 0).toLocaleString()} บ.</td>
                <td class="p-3 text-emerald-600 font-semibold">${Number(p.sellingPrice || 0).toLocaleString()} บ.</td>
                <td class="p-3 font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}">${qty.toLocaleString()} ชิ้น</td>
                <td class="p-3">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}">
                        ${isLow ? '⚠️ สต็อกต่ำ' : 'พร้อมส่ง'}
                    </span>
                </td>
            `;[cite: 1]
        });
    }

    currentStock = totalStockQty;[cite: 1]
    localStorage.setItem(DB_KEY_STOCK, currentStock.toString());[cite: 1]

    if (document.getElementById('home-total-stock')) document.getElementById('home-total-stock').innerText = totalStockQty.toLocaleString();[cite: 1]
    if (document.getElementById('home-item-count')) document.getElementById('home-item-count').innerText = stockProductsList.length;[cite: 1]
    if (document.getElementById('home-low-stock-count')) document.getElementById('home-low-stock-count').innerText = lowStockAlertCount;[cite: 1]
}

async function handleAddNewProduct(e) {[cite: 1]
    e.preventDefault();[cite: 1]
    const saveBtn = document.getElementById('btn-save-prod');[cite: 1]
    if (saveBtn) {[cite: 1]
        saveBtn.innerText = "⏳ กำลังบันทึก...";[cite: 1]
        saveBtn.disabled = true;[cite: 1]
    }

    const newProd = {[cite: 1]
        action: "addProduct",[cite: 1]
        sku: document.getElementById('p-sku').value,[cite: 1]
        productName: document.getElementById('p-name').value,[cite: 1]
        costPrice: Number(document.getElementById('p-cost').value),[cite: 1]
        sellingPrice: Number(document.getElementById('p-sell').value),[cite: 1]
        quantity: Number(document.getElementById('p-qty').value),[cite: 1]
        minAlert: Number(document.getElementById('p-min').value)[cite: 1]
    };

    try {[cite: 1]
        await fetch(GOOGLE_SCRIPT_URL, {[cite: 1]
            method: 'POST',[cite: 1]
            mode: 'no-cors',[cite: 1]
            headers: { 'Content-Type': 'application/json' },[cite: 1]
            body: JSON.stringify(newProd)[cite: 1]
        });

        alert("เพิ่มสินค้าใหม่ลง Google Sheet เรียบร้อยครับ!");[cite: 1]
        document.getElementById('add-product-form').reset();[cite: 1]
        document.getElementById('add-product-modal').classList.add('hidden');[cite: 1]
        
        setTimeout(fetchStockFromGoogleSheet, 1000);[cite: 1]
    } catch (err) {[cite: 1]
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูลสินค้า");[cite: 1]
        console.error(err);[cite: 1]
    } finally {
        if (saveBtn) {[cite: 1]
            saveBtn.innerText = "💾 บันทึกลง Sheet";[cite: 1]
            saveBtn.disabled = false;[cite: 1]
        }
    }
}

// ======================================================
// AUTHENTICATION SYSTEM
// ======================================================
function toggleAuthForm(target) {[cite: 1]
    if (target === 'register') {[cite: 1]
        document.getElementById('login-box').classList.add('hidden');[cite: 1]
        document.getElementById('register-box').classList.remove('hidden');[cite: 1]
    } else {
        document.getElementById('register-box').classList.add('hidden');[cite: 1]
        document.getElementById('login-box').classList.remove('hidden');[cite: 1]
    }
}

async function handleRegister(e) {[cite: 1]
    e.preventDefault();[cite: 1]
    const user = document.getElementById('reg-username').value.trim();[cite: 1]
    const pass = document.getElementById('reg-password').value;[cite: 1]
    const confirmPass = document.getElementById('reg-confirm-password').value;[cite: 1]

    if (pass !== confirmPass) {[cite: 1]
        alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน!');[cite: 1]
        return;[cite: 1]
    }

    if (usersList.some(u => u.username.toLowerCase() === user.toLowerCase())) {[cite: 1]
        alert('ชื่อผู้ใช้งานนี้ถูกใช้ไปแล้ว กรุณาใช้ชื่ออื่น');[cite: 1]
        return;[cite: 1]
    }

    const regBtn = document.getElementById('reg-submit-btn');[cite: 1]
    regBtn.innerText = "⏳ กำลังสมัครสมาชิก...";[cite: 1]
    regBtn.disabled = true;[cite: 1]

    usersList.push({ username: user, password: pass });[cite: 1]
    localStorage.setItem(DB_KEY_USERS, JSON.stringify(usersList));[cite: 1]

    try {[cite: 1]
        await fetch(GOOGLE_SCRIPT_URL, {[cite: 1]
            method: 'POST',[cite: 1]
            mode: 'no-cors',[cite: 1]
            headers: { 'Content-Type': 'application/json' },[cite: 1]
            body: JSON.stringify({ type: 'register', action: 'register', username: user, password: pass })[cite: 1]
        });
    } catch (err) {[cite: 1]
        console.error("ส่งข้อมูลสมาชิกลง Google Sheet ไม่สำเร็จ:", err);[cite: 1]
    }

    regBtn.innerText = "📝 ยืนยันการสมัครสมาชิก";[cite: 1]
    regBtn.disabled = false;[cite: 1]

    alert('🎉 สมัครสมาชิกสำเร็จ! กรุณาล็อกอินเข้าสู่ระบบ');[cite: 1]
    toggleAuthForm('login');[cite: 1]
}

function handleLogin(e) {[cite: 1]
    e.preventDefault();[cite: 1]
    const user = document.getElementById('login-username').value.trim();[cite: 1]
    const pass = document.getElementById('login-password').value;[cite: 1]
    const foundUser = usersList.find(u => u.username === user && u.password === pass);[cite: 1]

    if (foundUser) {[cite: 1]
        localStorage.setItem(DB_KEY_AUTH, foundUser.username);[cite: 1]
        if (document.getElementById('user-display-name')) {
            document.getElementById('user-display-name').innerText = foundUser.username;[cite: 1]
        }
        showMainApp();
        switchPage('dashboard');[cite: 1]
    } else {
        alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');[cite: 1]
    }
}

function handleLogout() {[cite: 1]
    localStorage.removeItem(DB_KEY_AUTH);[cite: 1]
    const loginOverlay = document.getElementById('login-overlay');
    const mainApp = document.getElementById('main-app');
    
    if (loginOverlay) loginOverlay.classList.remove('hidden');
    if (mainApp) mainApp.classList.add('hidden');
}

function checkAuthStatus() {[cite: 1]
    const loggedUser = localStorage.getItem(DB_KEY_AUTH);[cite: 1]
    if (loggedUser) {[cite: 1]
        if (document.getElementById('user-display-name')) {
            document.getElementById('user-display-name').innerText = loggedUser;[cite: 1]
        }
        showMainApp();
        switchPage('dashboard');[cite: 1]
    } else {
        const loginOverlay = document.getElementById('login-overlay');
        const mainApp = document.getElementById('main-app');
        if (loginOverlay) loginOverlay.classList.remove('hidden');
        if (mainApp) mainApp.classList.add('hidden');
    }
}

function showMainApp() {
    const loginOverlay = document.getElementById('login-overlay');
    const mainApp = document.getElementById('main-app');
    
    if (loginOverlay) loginOverlay.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
}

// ======================================================
// GOOGLE SHEET SYNC & FINANCE
// ======================================================
async function fetchDataFromGoogleSheet() {[cite: 1]
    try {[cite: 1]
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getOrders`);[cite: 1]
        if (response.ok) {[cite: 1]
            const data = await response.json();[cite: 1]
            if (Array.isArray(data) && data.length > 0) {[cite: 1]
                ordersList = data.map(item => ({[cite: 1]
                    name: item.name || item.Name || '-',[cite: 1]
                    courier: item.courier || item.Courier || '-',[cite: 1]
                    sellingPrice: parseFloat(item.sellingPrice || item.SellingPrice || 0),[cite: 1]
                    productCost: parseFloat(item.productCost || item.ProductCost || 0),[cite: 1]
                    shippingPrice: parseFloat(item.shippingPrice || item.ShippingPrice || 0),[cite: 1]
                    netProfit: parseFloat(item.netProfit || item.NetProfit || 0),[cite: 1]
                    margin: parseFloat(item.margin || item.Margin || 0)[cite: 1]
                }));
                localStorage.setItem(DB_KEY_ORDERS, JSON.stringify(ordersList));[cite: 1]
            }
        }
    } catch (err) {[cite: 1]
        console.log("ใช้งานข้อมูลจาก LocalStorage สำรอง:", err);[cite: 1]
    } finally {
        loadDashboardAndFinanceData();[cite: 1]
    }
}

function loadDashboardAndFinanceData() {[cite: 1]
    const stockEl = document.getElementById('total-stock-display');[cite: 1]
    const orderEl = document.getElementById('order-count-display');[cite: 1]
    if (stockEl) stockEl.innerText = `${currentStock} ชิ้น`;[cite: 1]
    if (orderEl) orderEl.innerText = `${ordersList.length} ออเดอร์`;[cite: 1]

    let rev = 0, cost = 0, ship = 0;[cite: 1]
    const finTable = document.getElementById('finance-table-body');[cite: 1]

    if (finTable) {[cite: 1]
        finTable.innerHTML = '';[cite: 1]
        if (ordersList.length === 0) {[cite: 1]
            finTable.innerHTML = `<tr class="text-slate-400" id="fin-empty-row"><td colspan="7" class="p-4 text-center">ยังไม่มีข้อมูลรายการขายและกำไรในขณะนี้</td></tr>`;[cite: 1]
        } else {
            ordersList.forEach(item => {[cite: 1]
                const itemRev = Number(item.sellingPrice) || 0;[cite: 1]
                const itemCost = Number(item.productCost) || 0;[cite: 1]
                const itemShip = Number(item.shippingPrice) || 0;[cite: 1]
                const itemProfit = Number(item.netProfit) || (itemRev - itemCost - itemShip);[cite: 1]
                const itemMargin = itemRev > 0 ? ((itemProfit / itemRev) * 100).toFixed(1) : (item.margin || 0);[cite: 1]

                rev += itemRev;[cite: 1]
                cost += itemCost;[cite: 1]
                ship += itemShip;[cite: 1]

                const row = finTable.insertRow();[cite: 1]
                row.className = "border-b border-slate-100 font-medium hover:bg-slate-50 transition";[cite: 1]
                row.innerHTML = `
                    <td class="p-3 font-bold text-slate-800">${item.name || '-'}</td>
                    <td class="p-3 text-slate-600">${item.courier || '-'}</td>
                    <td class="p-3 text-slate-700 font-semibold">${itemRev.toLocaleString()} บ.</td>
                    <td class="p-3 text-rose-500">${itemCost.toLocaleString()} บ.</td>
                    <td class="p-3 text-amber-600">${itemShip.toLocaleString()} บ.</td>
                    <td class="p-3 font-bold ${itemProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${itemProfit.toLocaleString()} บ.</td>
                    <td class="p-3"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${itemProfit >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">${itemMargin}%</span></td>
                `;[cite: 1]
            });
        }
    }

    const netProfitTotal = rev - cost - ship;[cite: 1]

    if (document.getElementById('fin-total-revenue')) document.getElementById('fin-total-revenue').innerText = rev.toLocaleString();[cite: 1]
    if (document.getElementById('fin-total-cost')) document.getElementById('fin-total-cost').innerText = cost.toLocaleString();[cite: 1]
    if (document.getElementById('fin-total-shipping')) document.getElementById('fin-total-shipping').innerText = ship.toLocaleString();[cite: 1]
    if (document.getElementById('fin-net-profit')) document.getElementById('fin-net-profit').innerText = netProfitTotal.toLocaleString();[cite: 1]

    setTimeout(() => {[cite: 1]
        renderFinanceCharts(cost, ship, netProfitTotal);[cite: 1]
    }, 150);
}

// 📈 เรนเดอร์ Donut Chart และ Line Chart (เปลี่ยนจาก Bar Chart เดิม)
function renderFinanceCharts(cost, shipping, profit) {[cite: 1]
    const donutCtx = document.getElementById('financeDonutChart');[cite: 1]
    const lineCtx = document.getElementById('financeLineChart') || document.getElementById('financeBarChart');[cite: 1]

    if (!donutCtx || !lineCtx || typeof Chart === 'undefined') return;[cite: 1]

    if (donutChartInstance) donutChartInstance.destroy();[cite: 1]
    if (lineChartInstance) lineChartInstance.destroy();[cite: 1]

    // 1. Doughnut Chart สัดส่วนโครงสร้างทางการเงิน
    donutChartInstance = new Chart(donutCtx, {[cite: 1]
        type: 'doughnut',[cite: 1]
        data: {[cite: 1]
            labels: ['ต้นทุนสินค้า', 'ค่าจัดส่ง', 'กำไรสุทธิ'],[cite: 1]
            datasets: [{[cite: 1]
                data: [cost, shipping, profit > 0 ? profit : 0],[cite: 1]
                backgroundColor: ['#f43f5e', '#f59e0b', '#10b981'],[cite: 1]
                borderWidth: 2,[cite: 1]
                borderColor: '#ffffff'[cite: 1]
            }]
        },
        options: {[cite: 1]
            responsive: true,[cite: 1]
            maintainAspectRatio: false,[cite: 1]
            plugins: {[cite: 1]
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Prompt', size: 11 } } }[cite: 1]
            }
        }
    });

    // 2. Line Chart แสดงแนวโน้ม 2 เส้น (ยอดขาย vs กำไรสุทธิ)
    const labels = ordersList.map((o, idx) => o.name || `ออเดอร์ ${idx + 1}`);[cite: 1]
    const revenues = ordersList.map(o => Number(o.sellingPrice) || 0);[cite: 1]
    const profits = ordersList.map(o => Number(o.netProfit) || (Number(o.sellingPrice || 0) - Number(o.productCost || 0) - Number(o.shippingPrice || 0)));[cite: 1]

    lineChartInstance = new Chart(lineCtx, {[cite: 1]
        type: 'line',[cite: 1]
        data: {[cite: 1]
            labels: labels.length > 0 ? labels : ['ไม่มีข้อมูล'],[cite: 1]
            datasets: [[cite: 1]
                {
                    label: 'ยอดขาย (บาท)',[cite: 1]
                    data: revenues.length > 0 ? revenues : [0],[cite: 1]
                    borderColor: '#374151', // เส้นสีเทาเข้ม[cite: 1]
                    backgroundColor: '#374151',[cite: 1]
                    borderWidth: 2.5,[cite: 1]
                    pointRadius: 4,[cite: 1]
                    pointHoverRadius: 6,[cite: 1]
                    tension: 0.1[cite: 1]
                },
                {
                    label: 'กำไรสุทธิ (บาท)',[cite: 1]
                    data: profits.length > 0 ? profits : [0],[cite: 1]
                    borderColor: '#EF4444', // เส้นสีแดง[cite: 1]
                    backgroundColor: '#EF4444',[cite: 1]
                    borderWidth: 2.5,[cite: 1]
                    pointRadius: 4,[cite: 1]
                    pointHoverRadius: 6,[cite: 1]
                    tension: 0.1[cite: 1]
                }
            ]
        },
        options: {[cite: 1]
            responsive: true,[cite: 1]
            maintainAspectRatio: false,[cite: 1]
            plugins: {[cite: 1]
                legend: {[cite: 1]
                    position: 'top',[cite: 1]
                    labels: { boxWidth: 12, font: { family: 'Prompt', size: 11 } }[cite: 1]
                }
            },
            scales: {[cite: 1]
                y: { beginAtZero: true, ticks: { font: { family: 'Prompt', size: 10 } }, grid: { color: '#F1F5F9' } },[cite: 1]
                x: { ticks: { font: { family: 'Prompt', size: 10 } }, grid: { color: '#F1F5F9' } }[cite: 1]
            }
        }
    });
}

function clearDatabase() {[cite: 1]
    if(confirm("คุณต้องการล้างข้อมูลบันทึกในเครื่องใช่หรือไม่?")) {[cite: 1]
        localStorage.removeItem(DB_KEY_ORDERS);[cite: 1]
        ordersList = [];[cite: 1]
        loadDashboardAndFinanceData();[cite: 1]
    }
}

// 🔍 ฟังก์ชันค้นหา Real-time ในตารางการเงิน
function filterFinanceTable() {[cite: 1]
    const input = document.getElementById('fin-search-input');[cite: 1]
    if (!input) return;[cite: 1]
    const filter = input.value.toLowerCase();[cite: 1]
    const rows = document.querySelectorAll('#finance-table-body tr');[cite: 1]
    
    rows.forEach(row => {[cite: 1]
        const text = row.innerText.toLowerCase();[cite: 1]
        if (text.includes(filter)) {[cite: 1]
            row.style.display = '';[cite: 1]
        } else {
            row.style.display = 'none';[cite: 1]
        }
    });
}

// ======================================================
// AI ADDRESS PROCESSING & PRINT
// ======================================================
async function processAddressAndShipping() {[cite: 1]
    const apiKey = document.getElementById('gemini-key-input').value.trim();[cite: 1]
    const rawText = document.getElementById('raw-address-input').value.trim();[cite: 1]
    const weight = document.getElementById('weight-input').value.trim();[cite: 1]
    
    if (!apiKey || !rawText || !weight) { alert("กรุณากรอกข้อมูลให้ครบถ้วนครับ"); return; }[cite: 1]

    document.getElementById('btn-text').innerText = "AI กำลังวิเคราะห์ต้นทุนค่าส่ง...";[cite: 1]
    document.getElementById('loading-spinner').classList.remove('hidden');[cite: 1]

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
}`;[cite: 1]

    try {[cite: 1]
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {[cite: 1]
            method: "POST",[cite: 1]
            headers: { "Content-Type": "application/json" },[cite: 1]
            body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] })[cite: 1]
        });

        const data = await response.json();[cite: 1]
        if (data.error) { alert("Error: " + data.error.message); return; }[cite: 1]

        let jsonText = data.candidates[0].content.parts[0].text;[cite: 1]
        jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();[cite: 1]
        const result = JSON.parse(jsonText);[cite: 1]
        
        document.getElementById('out-name').value = result.name || '';[cite: 1]
        document.getElementById('out-phone').value = result.phone || '';[cite: 1]
        document.getElementById('out-address1').value = result.address1 || '';[cite: 1]
        document.getElementById('out-subdistrict').value = result.subdistrict || '';[cite: 1]
        document.getElementById('out-district').value = result.district || '';[cite: 1]
        document.getElementById('out-province').value = result.province || '';[cite: 1]
        document.getElementById('out-zipcode').value = result.zipcode || '';[cite: 1]
        
        document.getElementById('out-courier').innerText = result.courier || '-';[cite: 1]
        document.getElementById('out-price').innerText = result.price || '0';[cite: 1]
        document.getElementById('out-reason').innerText = `*เหตุผล: ${result.reason || ''}`;[cite: 1]

        document.getElementById('status-badge').className = "bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-medium";[cite: 1]
        document.getElementById('status-badge').innerText = "✓ วิเคราะห์ต้นทุนค่าส่งเสร็จสิ้น";[cite: 1]
    } catch (error) {[cite: 1]
        console.error(error);[cite: 1]
        alert("เกิดข้อผิดพลาดในการคำนวณ ลองใหม่อีกครั้งครับ");[cite: 1]
    } finally {
        document.getElementById('btn-text').innerText = "✨ สั่ง AI จัดเรียงที่อยู่ + หาค่าส่งถูกที่สุด";[cite: 1]
        document.getElementById('loading-spinner').classList.add('hidden');[cite: 1]
    }
}

async function printLabel() {[cite: 1]
    const name = document.getElementById('out-name').value;[cite: 1]
    const courier = document.getElementById('out-courier').innerText;[cite: 1]
    const shippingPrice = parseFloat(document.getElementById('out-price').innerText) || 0;[cite: 1]
    const sellingPrice = parseFloat(document.getElementById('selling-price-input').value) || 0;[cite: 1]
    const productCost = parseFloat(document.getElementById('product-cost-input').value) || 0;[cite: 1]

    if(!name || courier === '-') { alert("กรุณาให้ AI สกัดที่อยู่ให้สำเร็จก่อนสั่งพิมพ์ครับ"); return; }[cite: 1]

    const netProfit = sellingPrice - productCost - shippingPrice;[cite: 1]
    const margin = sellingPrice > 0 ? ((netProfit / sellingPrice) * 100).toFixed(1) : 0;[cite: 1]

    const orderData = {[cite: 1]
        type: 'order',[cite: 1]
        id: Date.now(),[cite: 1]
        name: name,[cite: 1]
        courier: courier,[cite: 1]
        sellingPrice: sellingPrice,[cite: 1]
        productCost: productCost,[cite: 1]
        shippingPrice: shippingPrice,[cite: 1]
        netProfit: netProfit,[cite: 1]
        margin: margin[cite: 1]
    };

    const printBtn = document.getElementById('btn-print-save');[cite: 1]
    printBtn.innerHTML = "⏳ กำลังบันทึกลง Google Sheet...";[cite: 1]
    printBtn.disabled = true;[cite: 1]

    try {[cite: 1]
        await fetch(GOOGLE_SCRIPT_URL, {[cite: 1]
            method: 'POST',[cite: 1]
            mode: 'no-cors',[cite: 1]
            headers: { 'Content-Type': 'application/json' },[cite: 1]
            body: JSON.stringify(orderData)[cite: 1]
        });
    } catch (err) {[cite: 1]
        console.error("ส่ง Google Sheet ไม่สำเร็จ บันทึกลงเครื่องแทน:", err);[cite: 1]
    }

    ordersList.push(orderData);[cite: 1]
    currentStock -= 1;[cite: 1]

    localStorage.setItem(DB_KEY_ORDERS, JSON.stringify(ordersList));[cite: 1]
    localStorage.setItem(DB_KEY_STOCK, currentStock.toString());[cite: 1]

    loadDashboardAndFinanceData();[cite: 1]

    printBtn.innerHTML = "🖨️ พิมพ์ใบปะหน้า + บันทึกบัญชี";[cite: 1]
    printBtn.disabled = false;[cite: 1]

    alert(`🖨️ สั่งพิมพ์ใบปะหน้าสำเร็จ!\n📊 บันทึกข้อมูลเข้าสู่ Google Sheet เรียบร้อยครับ\n💰 ยอดขาย: ${sellingPrice} บาท | กำไรสุทธิ: ${netProfit} บาท`);[cite: 1]
}

function copyToClipboard() {[cite: 1]
    const name = document.getElementById('out-name').value;[cite: 1]
    const phone = document.getElementById('out-phone').value;[cite: 1]
    const addr = document.getElementById('out-address1').value;[cite: 1]
    const sub = document.getElementById('out-subdistrict').value;[cite: 1]
    const dist = document.getElementById('out-district').value;[cite: 1]
    const prov = document.getElementById('out-province').value;[cite: 1]
    const zip = document.getElementById('out-zipcode').value;[cite: 1]

    if(!name) { alert("ไม่มีข้อมูลที่อยู่ให้คัดลอกครับ"); return; }[cite: 1]
    const fullText = `ผู้รับ: ${name}\nโทร: ${phone}\nที่อยู่: ${addr} ต.${sub} อ.${dist} จ.${prov} ${zip}`;[cite: 1]
    navigator.clipboard.writeText(fullText);[cite: 1]
    alert("📋 คัดลอกที่อยู่เรียบร้อยครับ!");[cite: 1]
}

// ======================================================
// MAP & TRACKING FUNCTIONS
// ======================================================
function toggleDropdown() {[cite: 1]
    const menu = document.getElementById('courier-dropdown-menu');[cite: 1]
    if (menu) menu.classList.toggle('hidden');[cite: 1]
}

function selectCourier(val, imgPath, name) {[cite: 1]
    document.getElementById('selected-courier-val').value = val;[cite: 1]
    document.getElementById('selected-courier-display').innerHTML = `
        <img src="${imgPath}" class="w-6 h-6 object-contain rounded" alt="${name}">
        <span class="truncate">${name}</span>
    `;[cite: 1]
    document.getElementById('courier-dropdown-menu').classList.add('hidden');[cite: 1]
}

function trackParcelSimulated() {[cite: 1]
    const trackNum = document.getElementById('tracking-input').value.trim();[cite: 1]
    const courierDisplay = document.getElementById('selected-courier-display').innerHTML;[cite: 1]
    if(!trackNum) { alert("กรุณากรอกเลขพัสดุก่อนครับ"); return; }[cite: 1]
    document.getElementById('res-tracking-num').innerText = trackNum.toUpperCase();[cite: 1]
    document.getElementById('res-courier-name').innerHTML = courierDisplay;[cite: 1]
    document.getElementById('tracking-result-box').classList.remove('hidden');[cite: 1]
}

function openOfficialTracking() {[cite: 1]
    const trackNum = document.getElementById('tracking-input').value.trim();[cite: 1]
    const courier = document.getElementById('selected-courier-val').value;[cite: 1]
    let targetUrl = "";[cite: 1]
    if(courier === 'flash') targetUrl = `https://www.flashexpress.co.th/tracking/?se=${trackNum}`;[cite: 1]
    else if(courier === 'jnt') targetUrl = `https://www.jtexpress.co.th/index/query/gzquery.html?bill_code=${trackNum}`;[cite: 1]
    else if(courier === 'thailandpost') targetUrl = `https://track.thailandpost.co.th/?trackNumber=${trackNum}`;[cite: 1]
    else if(courier === 'kerry') targetUrl = `https://th.kex-express.com/th/track/?track=${trackNum}`;[cite: 1]
    window.open(targetUrl, '_blank');[cite: 1]
}

function updateMapByGPS() {[cite: 1]
    if (navigator.geolocation) {[cite: 1]
        navigator.geolocation.getCurrentPosition((position) => {[cite: 1]
            userLat = position.coords.latitude;[cite: 1]
            userLng = position.coords.longitude;[cite: 1]
            const searchQuery = encodeURIComponent("Express, ไปรษณีย์ไทย");[cite: 1]
            const mapFrame = document.getElementById('google-maps-frame');[cite: 1]
            if (mapFrame) mapFrame.src = `https://maps.google.com/maps?q=${searchQuery}&ll=${userLat},${userLng}&z=13&ie=UTF8&iwloc=&output=embed`;[cite: 1]
            if (document.getElementById('map-status-text')) {[cite: 1]
                document.getElementById('map-status-text').innerText = `✅ ดึงตำแหน่งปัจจุบัน (${userLat.toFixed(4)}, ${userLng.toFixed(4)}) แสดงหมุดขนส่งเรียบร้อยแล้ว`;[cite: 1]
            }
        });
    }
}

function openExternalGoogleMaps() {[cite: 1]
    window.open(`https://www.google.com/maps/search/ขนส่ง+ไปรษณีย์+Flash+J%26T+Kerry/@${userLat},${userLng},13z`, '_blank');[cite: 1]
}

// ======================================================
// AI CHATBOT & VOICE ASSISTANT
// ======================================================
let isListening = false;[cite: 1]
let recognition = null;[cite: 1]

function toggleChatModal() {[cite: 1]
    document.getElementById('ai-chat-modal').classList.toggle('hidden');[cite: 1]
}

function handleChatKeyPress(e) {[cite: 1]
    if (e.key === 'Enter') sendChatMessage();[cite: 1]
}

async function sendChatMessage() {[cite: 1]
    const inputField = document.getElementById('chat-input');[cite: 1]
    const userMessage = inputField.value.trim();[cite: 1]
    const apiKeyInput = document.getElementById('gemini-key-input');[cite: 1]
    const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';[cite: 1]

    if (!userMessage) return;[cite: 1]
    if (!apiKey) {[cite: 1]
        alert("กรุณากรอก Gemini API Key ในหน้า 'AI คัดแยกที่อยู่' ก่อนใช้งานแชทครับ!");[cite: 1]
        return;[cite: 1]
    }

    appendMessage(userMessage, 'user');[cite: 1]
    inputField.value = '';[cite: 1]

    const loadingElem = appendMessage("กำลังคิดคำตอบ...", 'ai-loading');[cite: 1]

    const systemPrompt = `คุณคือ "ShipMax Assistant" ผู้ช่วยประจำระบบจัดการคลังสินค้า คำนวณค่าจัดส่ง และสรุปบัญชีต้นทุน-กำไร
1. ตอบเฉพาะคำถามที่เกี่ยวข้องกับระบบ ShipMax นี้เท่านั้น
2. สต็อกปัจจุบัน: ${currentStock} ชิ้น, ออเดอร์ทั้งหมด: ${ordersList.length} รายการ
3. ขนส่งที่รองรับ: Flash, J&T, ไปรษณีย์ไทย, KEX
4. หากถามเรื่องอื่น ให้ปฏิเสธอย่างสุภาพ`;[cite: 1]

    try {[cite: 1]
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {[cite: 1]
            method: "POST",[cite: 1]
            headers: { "Content-Type": "application/json" },[cite: 1]
            body: JSON.stringify({[cite: 1]
                contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\nคำถามจากผู้ใช้: ${userMessage}` }] }][cite: 1]
            })
        });

        const data = await response.json();[cite: 1]

        if (loadingElem && loadingElem.parentNode) {[cite: 1]
            loadingElem.parentNode.removeChild(loadingElem);[cite: 1]
        }

        if (data.candidates && data.candidates[0] && data.candidates[0].content.parts[0].text) {[cite: 1]
            const aiReply = data.candidates[0].content.parts[0].text;[cite: 1]
            appendMessage(aiReply, 'ai');[cite: 1]
            speakText(aiReply);[cite: 1]
        } else {
            appendMessage("ขออภัยครับ ไม่สามารถดึงคำตอบได้ กรุณาลองใหม่อีกครั้ง", 'ai');[cite: 1]
        }
    } catch (err) {[cite: 1]
        console.error("Chat Error:", err);[cite: 1]
        if (loadingElem && loadingElem.parentNode) {[cite: 1]
            loadingElem.parentNode.removeChild(loadingElem);[cite: 1]
        }
        appendMessage("เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI ครับ", 'ai');[cite: 1]
    }
}

function appendMessage(text, sender) {[cite: 1]
    const chatContainer = document.getElementById('chat-messages');[cite: 1]
    const msgDiv = document.createElement('div');[cite: 1]

    if (sender === 'user') {[cite: 1]
        msgDiv.className = "bg-slate-900 text-white p-3 rounded-xl rounded-tr-none max-w-[85%] ml-auto shadow-sm text-xs";[cite: 1]
        msgDiv.innerText = text;[cite: 1]
    } else if (sender === 'ai') {[cite: 1]
        msgDiv.className = "bg-emerald-100 text-emerald-950 p-3 rounded-xl rounded-tl-none max-w-[85%] shadow-sm text-xs leading-relaxed space-y-1";[cite: 1]
        let formattedText = text[cite: 1]
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')[cite: 1]
            .replace(/\n/g, '<br>');[cite: 1]
        msgDiv.innerHTML = formattedText;[cite: 1]
    } else {
        msgDiv.className = "bg-slate-200 text-slate-600 p-3 rounded-xl rounded-tl-none max-w-[85%] animate-pulse text-xs";[cite: 1]
        msgDiv.innerText = text;[cite: 1]
    }

    chatContainer.appendChild(msgDiv);[cite: 1]
    chatContainer.scrollTop = chatContainer.scrollHeight;[cite: 1]

    return msgDiv;[cite: 1]
}

function speakText(text) {[cite: 1]
    if (!('speechSynthesis' in window)) return;[cite: 1]

    window.speechSynthesis.cancel();[cite: 1]

    let cleanText = text[cite: 1]
        .replace(/<[^>]*>/g, '')[cite: 1]
        .replace(/\*\*/g, '')[cite: 1]
        .replace(/#/g, '')[cite: 1]
        .replace(/[\*\-\_]/g, '')[cite: 1]
        .replace(/\n+/g, ' ')[cite: 1]
        .trim();[cite: 1]

    if (!cleanText) return;[cite: 1]

    const utterance = new SpeechSynthesisUtterance(cleanText);[cite: 1]
    utterance.lang = 'th-TH';[cite: 1]
    utterance.rate = 1.0;[cite: 1]
    utterance.pitch = 1.0;[cite: 1]

    const getThaiVoice = () => {[cite: 1]
        const voices = window.speechSynthesis.getVoices();[cite: 1]
        const thaiVoice = voices.find(voice => 
            voice.lang.includes('th') || 
            voice.lang.includes('TH') || 
            voice.name.toLowerCase().includes('thai')
        );[cite: 1]

        if (thaiVoice) {[cite: 1]
            utterance.voice = thaiVoice;[cite: 1]
        }
        
        window.speechSynthesis.speak(utterance);[cite: 1]
    };

    if (window.speechSynthesis.getVoices().length > 0) {[cite: 1]
        getThaiVoice();[cite: 1]
    } else {
        window.speechSynthesis.onvoiceschanged = getThaiVoice;[cite: 1]
    }
}

function toggleVoiceRecognition() {[cite: 1]
    const micBtn = document.getElementById('btn-mic');[cite: 1]
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {[cite: 1]
        alert("เบราว์เซอร์นี้ไม่รองรับระบบสั่งงานด้วยเสียงครับ (แนะนำให้ใช้ Google Chrome)");[cite: 1]
        return;[cite: 1]
    }

    if (isListening) {[cite: 1]
        if (recognition) recognition.stop();[cite: 1]
        return;[cite: 1]
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;[cite: 1]
    recognition = new SpeechRecognition();[cite: 1]
    recognition.lang = 'th-TH';[cite: 1]

    recognition.onstart = function() {[cite: 1]
        isListening = true;[cite: 1]
        if (micBtn) micBtn.className = "p-2.5 bg-rose-500 text-white rounded-xl transition text-base animate-bounce";[cite: 1]
    };

    recognition.onresult = function(event) {[cite: 1]
        const transcript = event.results[0][0].transcript;[cite: 1]
        document.getElementById('chat-input').value = transcript;[cite: 1]
        sendChatMessage();[cite: 1]
    };

    recognition.onend = function() {[cite: 1]
        isListening = false;[cite: 1]
        if (micBtn) micBtn.className = "p-2.5 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-600 rounded-xl transition text-base";[cite: 1]
    };

    recognition.start();[cite: 1]
}
