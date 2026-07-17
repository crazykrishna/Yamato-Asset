// SAFE NAVIGATION LISTENERS
document.getElementById('home')?.addEventListener("click",() => { window.location.href = "/home"; });
document.getElementById('assets-list')?.addEventListener("click",() => { window.location.href = "/assets-list"; });
document.getElementById('inventory')?.addEventListener("click",() => { window.location.href = "/inventory"; });
document.getElementById('reports')?.addEventListener("click",() => { window.location.href = "/reports"; });
document.getElementById('log-out')?.addEventListener("click",() => {
    alert("Log-Out Successful! Back to login page. ");
    window.location.href = "/login"; 
});
document.getElementById('find')?.addEventListener("click",() => { window.location.href = "/inventory"; });
document.getElementById('Register-Asset')?.addEventListener("click",() => { window.location.href = "/register-asset"; });
document.getElementById('assests-list')?.addEventListener("click",() => { window.location.href = "/assets-list"; });
document.getElementById('Register-New-User')?.addEventListener("click",() => { window.location.href = "/register-user"; });
document.getElementById('profilee')?.addEventListener("click",() => { window.location.href = "/profile"; });

const api_url = '/api/regAssets';

let colIndices = {
    status: -1,
    type: -1,
    date: -1
};

function populateFilterOptions(selectElement, dataset, columnName, defaultText) {
    if (!selectElement || dataset.length === 0) return;
    
    const sampleKeys = Object.keys(dataset[0]);
    const actualKey = sampleKeys.find(key => {
        const kLower = key.toLowerCase();
        if (columnName === 'type') {
            return kLower.includes('type') || kLower.includes('category');
        }
        return kLower.includes(columnName.toLowerCase());
    });
    
    const uniqueValues = new Set();
    if (actualKey) {
        dataset.forEach(row => {
            const val = row[actualKey];
            if (val !== null && val !== undefined && val !== "") {
                uniqueValues.add(String(val).trim());
            }
        });
    }
    
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    
    Array.from(uniqueValues).sort().forEach(val => {
        const opt = document.createElement('option');
        opt.value = val.toLowerCase();
        opt.innerText = val;
        selectElement.appendChild(opt);
    });
}

// Consolidated Client Filtering logic
function applyFilters() {
    const searchVal = document.getElementById('table-search')?.value.toLowerCase() || '';
    const statusVal = document.getElementById('filter-status')?.value.toLowerCase() || '';
    const typeVal = document.getElementById('filter-type')?.value.toLowerCase() || '';
    const dateVal = document.getElementById('filter-date')?.value || '';

    const tableBody = document.getElementById('gridBody');
    if (!tableBody) return;
    const rows = tableBody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.cells.length <= 1) continue; // Skip helper rows like "No records found"

        // 1. Search text filter
        const rowText = row.textContent.toLowerCase();
        const matchesSearch = !searchVal || rowText.includes(searchVal);

        // 2. Status filter
        const statusCell = colIndices.status !== -1 ? row.cells[colIndices.status]?.textContent.trim().toLowerCase() || "" : "";
        const matchesStatus = !statusVal || statusCell === statusVal;

        // 3. Type filter
        const typeCell = colIndices.type !== -1 ? row.cells[colIndices.type]?.textContent.toLowerCase() || "" : "";
        const matchesType = !typeVal || typeCell.includes(typeVal);

        // 4. Date filter
        const dateCell = colIndices.date !== -1 ? row.cells[colIndices.date]?.textContent.toLowerCase() || "" : "";
        const matchesDate = !dateVal || dateCell.startsWith(dateVal);

        if (matchesSearch && matchesStatus && matchesType && matchesDate) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    }
}

// Bind event listeners to filter controls
document.getElementById('table-search')?.addEventListener('input', applyFilters);
document.getElementById('filter-status')?.addEventListener('change', applyFilters);
document.getElementById('filter-type')?.addEventListener('change', applyFilters);
document.getElementById('filter-date')?.addEventListener('input', applyFilters);
document.getElementById('filter-date')?.addEventListener('change', applyFilters);

// RESTORED & FIXED: Core data engine to fetch current metrics and invoke dynamic parsing
async function fetchAssets() {
    try {
        const response = await fetch(api_url);
        if (!response.ok) throw new Error("Network response was not OK");

        const assets = await response.json();
        renderDynamicAssetTable(assets); // Feeds raw array straight to the dynamic renderer
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

// Dynamic Table Generator
function renderDynamicAssetTable(assets) {
    const tableHeader = document.getElementById('gridHeader'); 
    const tableBody = document.getElementById('gridBody');

    if (!tableHeader || !tableBody) return;

    // Clear out old headers and rows completely
    tableHeader.innerHTML = "";
    tableBody.innerHTML = "";

    if (!assets || assets.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='100%'>No asset records found. Please upload a spreadsheet from your Profile.</td></tr>";
        return;
    }

    // 1. Grab columns dynamically based on first data object attributes
    const columns = Object.keys(assets[0]);
    colIndices.status = columns.findIndex(col => col.toLowerCase().includes('status'));
    colIndices.type = columns.findIndex(col => col.toLowerCase().includes('type') || col.toLowerCase().includes('category'));
    colIndices.date = columns.findIndex(col => col.toLowerCase().includes('date'));

    const statusSelect = document.getElementById('filter-status');
    const typeSelect = document.getElementById('filter-type');

    populateFilterOptions(statusSelect, assets, 'status', 'Filter By Status');
    populateFilterOptions(typeSelect, assets, 'type', 'Filter By Type');

    // 2. Render headers line items
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

    // 3. Render matching dynamic cell configurations
    assets.forEach(asset => {
        const row = document.createElement('tr');
        const currentId = asset.assetId || asset.assetid || '';
        
        row.dataset.id = currentId;
        // FIXED: Binding reference variable to row DOM context so update mapping can track changes
        row.dataset.employeeRef = asset.employee_name || ''; 

        columns.forEach(col => {
            const td = document.createElement('td');
            let cellValue = asset[col] !== null && asset[col] !== undefined ? asset[col] : "";

            // Clean date fields cleanly if they contain ISO timestamps
            if (col.toLowerCase().includes('date') && cellValue.length > 10) {
                cellValue = cellValue.substring(0, 10);
            }

            td.innerText = cellValue;
            
            // Assign edit markers to parameters unless restricted explicitly
            if (col !== 'email' && col !== 'phone_number' && col !== 'assetId' && col !== 'assetid') {
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

    // Fire listeners trigger bound to fresh elements
    attachActionListeners();
    applyFilters();
}

function attachActionListeners() {
    // 1. Edit Mode Configuration
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

    // 2. Save Action Submission logic
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });

    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            const employeeRef = row.dataset.employeeRef; 
            const editBtn = row.querySelector('.edit-btn');
            const saveBtn = row.querySelector('.save-btn');

            const updatedData = { 
                assetId: parseInt(id) || id,
                originalEmployeeName: employeeRef || '',
                employee_name: '' 
            };

            // Process text modifications out of row elements input boxes
            row.querySelectorAll('.editable').forEach(cell => {
                const fieldName = cell.dataset.field;
                const inputNode = cell.querySelector('input');
                const inputValue = inputNode ? inputNode.value.trim() : cell.innerText.trim();
                
                updatedData[fieldName] = inputValue;
                cell.innerText = inputValue || 'N/A';
            });

            // Make sure the custom field points to the dynamic attribute key
            updatedData.employee_name = updatedData.employee_name || updatedData.employeeName || '';

            try {
                const response = await fetch(`/api/assigned-assets/update?assetId=${updatedData.assetId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData)
                });

                if (response.ok) {
                    alert("Record saved successfully across both databases!");
                    editBtn.style.display = "inline-block";
                    saveBtn.style.display = "none";
                    fetchAssets(); // Refresh active query table state
                } else {
                    const err = await response.json();
                    alert("Failed to commit changes: " + JSON.stringify(err.detail || err));
                    fetchAssets(); 
                }
            } catch (error) {
                console.error("Transmission breakdown:", error);
                alert("Could not process persistence request.");
                fetchAssets();
            }
        });
    });
}

window.addEventListener('DOMContentLoaded', fetchAssets);