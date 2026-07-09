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

const api_url = 'http://localhost:8000/api/assigned-assets';
const searchinput = document.getElementById('table-search');

if (searchinput){
    searchinput.addEventListener('input', (event) => {
        const searchitem = event.target.value.toLowerCase();
        const tablebody = document.getElementById('asset-fetch');
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

// Render dynamic table rows
async function fetchAssets() {
    try {
        const response = await fetch(api_url);
        if (!response.ok) throw new Error("Network response was not OK");

        const assets = await response.json();
        const tablebody = document.getElementById('asset-fetch');
        if (!tablebody) return;

        tablebody.innerHTML = '';

        assets.forEach(asset => {
            const row = document.createElement('tr');
            // Safely fall back if columns are returned lowercase or mixed-case
            const currentId = asset.assetId || asset.assetid;
            row.dataset.id = currentId; 

            row.innerHTML = `
                <td>${currentId || 'N/A'}</td>
                <td class="editable" data-field="name">${asset.asset_name || asset.name || 'N/A'}</td>
                <td class="editable" data-fi eld="asset_type">${asset.asset_type || 'N/A'}</td>
                <td class="editable" data-field="status">${asset.status || 'N/A'}</td>
                <td class="editable" data-field="purchase_date">${asset.purchase_date || 'N/A'}</td>
                <td class="editable" data-field="employee_name">${asset.employee_name || 'N/A'}</td>
                <td data-field="email">${asset.email || 'N/A'}</td>
                <td data-field="phone_number">${asset.phone_number || 'N/A'}</td>
                <td class="editable" data-field="remarks">${asset.remarks || asset.Remarks || ''}</td>
                <td>
                    <i class="ri-edit-line edit-btn" style="cursor:pointer; margin-right:8px; color:#0056b3;"></i>
                    <i class="ri-save-line save-btn" style="cursor:pointer; color:green; display:none;"></i>
                </td>
            `;
            tablebody.appendChild(row);
        });

        attachActionListeners();
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function attachActionListeners() {
    // 1. Edit Action Triggered
    document.querySelectorAll('.edit-btn').forEach(btn => {
        // Clear out old click listener duplicates to avoid messy stacking
        btn.replaceWith(btn.cloneNode(true));
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const editBtn = row.querySelector('.edit-btn');
            const saveBtn = row.querySelector('.save-btn');

            // Turn all marked cells in this specific row into active input textboxes
            row.querySelectorAll('.editable').forEach(cell => {
                const currentText = cell.innerText === 'N/A' ? '' : cell.innerText;
                cell.innerHTML = `<input type="text" value="${currentText}" style="width:90%; padding:4px;"/>`;
            });

            // Toggle tool icons smoothly
            editBtn.style.display = "none";
            saveBtn.style.display = "inline-block";
        });
    });

    // 2. Save Action Triggered
    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });

    document.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            const id = row.dataset.id;
            const employeeRef = row.dataset.employeeRef; // Reference data for cross-db update
            const editBtn = row.querySelector('.edit-btn');
            const saveBtn = row.querySelector('.save-btn');

            // Ensure this dataset field assignment is configured properly in your save-btn block
            const updatedData = { 
                assetId: parseInt(id) || id,
                originalEmployeeName: employeeRef || '',
                
                // Grabs what you type into the 'Asset Owner' cell and submits it as employee_name
                employee_name: row.querySelector('[data-field="employee_name"] input')?.value.trim() || row.querySelector('[data-field="employee_name"]').innerText.trim()
            };

            // Read edited string values out from your modified inputs
            row.querySelectorAll('.editable').forEach(cell => {
                const fieldName = cell.dataset.field;
                const inputValue = cell.querySelector('input').value.trim();
                updatedData[fieldName] = inputValue;
                
                // Instantly update UI visually to display the text value early
                cell.innerText = inputValue || 'N/A';
            });

            // Locate this block inside your save-btn click event listener in assets list.js:
            try {
                // FIXED: Appending ?assetId= to the URL path to satisfy any strict query validations
                const response = await fetch(`http://127.0.0.1:8000/api/assigned-assets/update?assetId=${updatedData.assetId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedData) // Still sending the complete object payload here
                });

                if (response.ok) {
                    alert("Record saved successfully across both databases!");
                    editBtn.style.display = "inline-block";
                    saveBtn.style.display = "none";
                    fetchAssets(); 
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