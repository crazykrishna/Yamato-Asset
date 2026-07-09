// Change this to 'http://localhost:8000/api/regAssets' if this file is for your Assets List page!
const api_url = 'http://localhost:8000/api/regAssets';

// SAFE NAVIGATION LISTENERS: Optional chaining (?.) prevents crashes if a button isn't on the current page
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

// DYNAMIC FILTER ENGINE
function filterTable() {
    const searchinput = document.getElementById('table-search');
    const searchFilter = searchinput ? searchinput.value.toLowerCase() : "";

    const selects = document.querySelectorAll('#filters select');
    const categoryFilter = selects[0] ? selects[0].value.toLowerCase() : "";
    const typeFilter = selects[1] ? selects[1].value.toLowerCase() : "";
    const statusFilter = selects[2] ? selects[2].value.toLowerCase() : "";

    const tablebody = document.getElementById('asset-fetch');
    if (!tablebody) return;
    const rows = tablebody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowText = row.textContent.toLowerCase();
        
        // Robust Fallback: Checks all cells or extracts text content safely
        const assetTypeCell = row.querySelector('[data-field="asset_type"]')?.textContent.toLowerCase() || "";
        const statusCell = row.querySelector('[data-field="status"]')?.textContent.toLowerCase() || "";

        const matchesCategory = !categoryFilter || rowText.includes(categoryFilter);
        const matchesType = !typeFilter || assetTypeCell.includes(typeFilter);
        const matchesStatus = !statusFilter || statusCell.includes(statusFilter);
        const matchesSearch = !searchFilter || rowText.includes(searchFilter);

        if (matchesCategory && matchesType && matchesStatus && matchesSearch) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

// Attach filtering events safely
document.querySelectorAll('#filters select').forEach(select => {
    select.addEventListener('change', filterTable);
});
document.getElementById('table-search')?.addEventListener('input', filterTable);

// UPGRADED MUTATION ROW AGGREGATOR
async function fetchAssets() {
    try {
        console.log("Fetching data from: ", api_url);
        const response = await fetch(api_url);
        if (!response.ok) throw new Error(`Network error: ${response.status}`);

        const assets = await response.json();
        const tablebody = document.getElementById('asset-fetch');
        if (!tablebody) {
            console.error("Target container DOM element '#asset-fetch' could not be found.");
            return;
        }

        tablebody.innerHTML = '';

        assets.forEach(asset => {
            const row = document.createElement('tr');
            // Safely map primary key depending on table casing conventions (assetId vs assetid)
            const currentId = asset.assetId || asset.assetid || '';
            row.dataset.id = currentId; 

            row.innerHTML = `
                <td>${currentId || 'N/A'}</td>
                <td class="editable" data-field="name">${asset.name || asset.asset_name || 'N/A'}</td>
                <td class="editable" data-field="serialNo">${asset.serialNo || asset.serialno || 'N/A'}</td>
                <td class="editable" data-field="purchase_date">${asset.purchase_date ? asset.purchase_date.substring(0, 10) : 'N/A'}</td>
                <td class="editable" data-field="asset_type">${asset.asset_type || 'N/A'}</td>
                <td class="editable" data-field="status">${asset.status || 'N/A'}</td>
                <td class="editable" data-field="remarks">${asset.Remarks || asset.remarks || ''}</td>
                <td>
                    <i class="ri-edit-line edit-btn" style="cursor:pointer; margin-right:8px; color:#0056b3;"></i>
                    <i class="ri-save-line save-btn" style="cursor:pointer; color:green; display:none;"></i>
                </td>
            `;
            tablebody.appendChild(row);
        });

        attachActionListeners();

    } catch (error) {
        console.error('Data loading sequence failed:', error);
    }
}

function attachActionListeners() {
    // 1. Edit Mode Activation
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true)); // Wipe stale references cleanly
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

    // 2. Save Mode Persist Transactions
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

            row.querySelectorAll('.editable').forEach(cell => {
                const fieldName = cell.dataset.field;
                const inputValue = cell.querySelector('input').value;
                updatedData[fieldName] = inputValue;
                cell.innerText = inputValue || 'N/A';
            });

            try {
                const response = await fetch(`http://127.0.0.1:8000/api/assets/update`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    alert("Record saved successfully!");
                    editBtn.style.display = "inline-block";
                    saveBtn.style.display = "none";
                } else {
                    const err = await response.json();
                    alert("Failed to commit changes: " + (err.detail || "Server error"));
                    fetchAssets(); // Refresh grid layout on validation error
                }
            } catch (error) {
                console.error("Transmission breakdown during save:", error);
                alert("Could not process persistence request.");
                fetchAssets();
            }
        });
    });
}

// Launch application rendering routine
window.addEventListener('DOMContentLoaded', fetchAssets);