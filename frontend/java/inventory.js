// Connected directly to your unified registeredassets core engine 
const api_url = 'http://127.0.0.1:8000/api/assets';

// SAFE NAVIGATION LISTENERS
document.getElementById('home')?.addEventListener("click", () => { window.location.href = "home.html"; });
document.getElementById('assets-list')?.addEventListener("click", () => { window.location.href = "assets list.html"; });
document.getElementById('inventory')?.addEventListener("click", () => { window.location.href = "inventory.html"; });
document.getElementById('reports')?.addEventListener("click", () => { window.location.href = "reports.html"; });
document.getElementById('log-out')?.addEventListener("click", () => {
    alert("Log-Out Successful! Back to login page.");
    window.location.href = "login.html"; 
});
document.getElementById('find')?.addEventListener("click", () => { window.location.href = "inventory.html"; });
document.getElementById('Register-Asset')?.addEventListener("click", () => { window.location.href = "register asset.html"; });
document.getElementById('assests-list')?.addEventListener("click", () => { window.location.href = "assets list.html"; });
document.getElementById('Register-New-User')?.addEventListener("click", () => { window.location.href = "register new user.html"; });
document.getElementById('profilee')?.addEventListener("click", () => { window.location.href = "profile.html"; });

// REFACTORED UNIVERSAL CLIENT SEARCH & DROP FILTER ENGINE
function filterTable() {
    const searchinput = document.getElementById('table-search');
    const searchFilter = searchinput ? searchinput.value.toLowerCase() : "";

    // Gathers selections across your select element nodes
    const selectStatus = document.querySelector('#filter-by-status select')?.value.toLowerCase() || "";
    const selectDept = document.querySelector('#filter-by-department select')?.value.toLowerCase() || "";
    const selectType = document.querySelector('#filter-by-type select')?.value.toLowerCase() || "";

    const tablebody = document.getElementById('asset-fetch');
    if (!tablebody) return;
    const rows = tablebody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowText = row.textContent.toLowerCase();

        // Checks specific tracking column coordinates safely via data attributes
        const assetTypeCell = row.querySelector('[data-field*="type"]')?.textContent.toLowerCase() || "";
        const statusCell = row.querySelector('[data-field*="status"]')?.textContent.toLowerCase() || "";

        const matchesSearch = !searchFilter || rowText.includes(searchFilter);
        const matchesStatus = !selectStatus || statusCell.includes(selectStatus);
        const matchesType = !selectType || assetTypeCell.includes(selectType);
        // Department fallback text checking
        const matchesDept = !selectDept || rowText.includes(selectDept);

        if (matchesSearch && matchesStatus && matchesType && matchesDept) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

// Bind universal handlers safely
document.querySelectorAll('#filters select').forEach(select => {
    select.addEventListener('change', filterTable);
});
document.getElementById('table-search')?.addEventListener('input', filterTable);

// FETCH RUNTIME LOGIC
async function fetchAssets() {
    try {
        const response = await fetch(api_url);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);

        const assets = await response.json();
        renderDynamicInventoryTable(assets);
    } catch (error) {
        console.error('Data loading sequence failed:', error);
    }
}

// DYNAMIC INVENTORY GRID CONSTRUCTOR
function renderDynamicInventoryTable(assets) {
    const tableHeader = document.getElementById('gridHeader'); 
    const tableBody = document.getElementById('asset-fetch');

    if (!tableHeader || !tableBody) return;

    tableHeader.innerHTML = "";
    tableBody.innerHTML = "";

    if (!assets || assets.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='100%'>No inventory records found. Please upload your spreadsheet from your Profile page.</td></tr>";
        return;
    }

    // 1. Extract spreadsheet columns dynamically
    const columns = Object.keys(assets[0]);

    // 2. Render Header Nodes
    const headerRow = document.createElement('tr');
    columns.forEach(col => {
        const th = document.createElement('th');
        th.innerText = col.toUpperCase().replace(/_/g, " ");
        headerRow.appendChild(th);
    });
    
    const actionTh = document.createElement('th');
    actionTh.innerText = "ACTIONS";
    headerRow.appendChild(actionTh);
    tableHeader.appendChild(headerRow);

    // 3. Render Cell Node Row Iterations
    assets.forEach(asset => {
        const row = document.createElement('tr');
        const currentId = asset.assetId || asset.assetid || '';
        row.dataset.id = currentId; 

        columns.forEach(col => {
            const td = document.createElement('td');
            let cellValue = asset[col] !== null && asset[col] !== undefined ? asset[col] : "";
            
            // Clean date fields cleanly if they contain ISO timestamps
            if (col.toLowerCase().includes('date') && cellValue.length > 10) {
                cellValue = cellValue.substring(0, 10);
            }

            td.innerText = cellValue;
            
            // Allow all columns except ID primary keys to be edited
            if (col !== 'assetId' && col !== 'assetid') {
                td.classList.add('editable');
                td.setAttribute('data-field', col);
            }
            row.appendChild(td);
        });

        const actionTd = document.createElement('td');
        actionTd.innerHTML = `
            <i class="ri-edit-line edit-btn" style="cursor:pointer; margin-right:8px; color:#0056b3;"></i>
            <i class="ri-save-line save-btn" style="cursor:pointer; color:green; display:none;"></i>
        `;
        row.appendChild(actionTd);
        tableBody.appendChild(row);
    });

    attachActionListeners();
}

function attachActionListeners() {
    // 1. Edit Action Configuration
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const editBtn = row.querySelector('.edit-btn');
            const saveBtn = row.querySelector('.save-btn');

            row.querySelectorAll('.editable').forEach(cell => {
                const currentText = cell.innerText === 'N/A' ? '' : cell.innerText;
                cell.innerHTML = `<input type="text" value="${currentText}" style="width:90%; padding:4px;"/>`;
            });

            editBtn.style.display = "none";
            saveBtn.style.display = "inline-block";
        });
    });

    // 2. Save Transaction Payload Handler
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });

    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            const editBtn = row.querySelector('.edit-btn');
            const saveBtn = row.querySelector('.save-btn');

            const updatedData = { assetId: parseInt(id) || id };

            // Inside your save button click listener rule:
            row.querySelectorAll('.editable').forEach(cell => {
                const fieldName = cell.dataset.field; // This contains the exact lowercase column name from your Excel!
                const inputElement = cell.querySelector('input');
                const inputValue = inputElement ? inputElement.value.trim() : cell.innerText.trim();
                
                updatedData[fieldName] = inputValue; // Packages it dynamically into the payload dictionary
                cell.innerText = inputValue || 'N/A';
            });

            try {
                const response = await fetch(`http://127.0.0.1:8000/api/assets/update`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    alert("Changes committed to your currentassets database table successfully!");
                    editBtn.style.display = "inline-block";
                    saveBtn.style.display = "none";
                } else {
                    const err = await response.json();
                    alert("Failed to commit changes: " + (err.detail || "Server error"));
                    fetchAssets(); 
                }
            } catch (error) {
                console.error("Transmission error:", error);
                alert("Could not process persistence request.");
                fetchAssets();
            }
        });
    });
}

window.addEventListener('DOMContentLoaded', fetchAssets);

