// SAFE NAVIGATION LISTENERS
document.getElementById('home')?.addEventListener("click",() => { window.location.href = "home.html"; });
document.getElementById('assets-list')?.addEventListener("click",() => { window.location.href = "assets list.html"; });
document.getElementById('inventory')?.addEventListener("click",() => { window.location.href = "inventory.html"; });
document.getElementById('reports')?.addEventListener("click",() => { window.location.href = "reports.html"; });
document.getElementById('log-out')?.addEventListener("click",() => {
    alert("Log-Out Successful! Back to login page. ");
    window.location.href = "login.html"; 
});
document.getElementById('find')?.addEventListener("click",() => { window.location.href = "inventory.html"; });
document.getElementById('Register-Asset')?.addEventListener("click",() => { window.location.href = "register asset.html"; });
document.getElementById('assests-list')?.addEventListener("click",() => { window.location.href = "assets list.html"; });
document.getElementById('Register-New-User')?.addEventListener("click",() => { window.location.href = "register new user.html"; });
document.getElementById('profilee')?.addEventListener("click",() => { window.location.href = "profile.html"; });

const api_url = 'http://127.0.0.1:8000/api/regAssets';
const searchinput = document.getElementById('table-search');

// Search Bar Client Filtering logic
if (searchinput){
    searchinput.addEventListener('input', (event) => {
        const searchitem = event.target.value.toLowerCase();
        const tablebody = document.getElementById('gridBody'); // Updated to point to dynamic body ID
        if (!tablebody) return;
        const rows = tablebody.getElementsByTagName('tr');

        for (let i = 0; i < rows.length; i++){
            const row = rows[i];
            const rowText = row.textContent.toLowerCase();
            if(rowText.includes(searchitem)){
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        }
    });
}

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
            td.innerText = asset[col] !== null && asset[col] !== undefined ? asset[col] : "";
            
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
                const response = await fetch(`http://127.0.0.1:8000/api/assigned-assets/update?assetId=${updatedData.assetId}`, {
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