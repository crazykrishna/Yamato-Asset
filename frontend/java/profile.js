// SAFE NAVIGATION LISTENERS: Optional chaining (?.) prevents crashes if a button isn't on the current page
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

// SPREADSHEET INGESTION BRIDGE
document.getElementById('uploadbtn')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('excelfile');
    const statusText = document.getElementById('uploadstatus');
    
    if (!fileInput || fileInput.files.length === 0) {
        if (statusText) statusText.innerText = "Please select an Excel file first!";
        if (statusText) statusText.style.color = "red";
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (statusText) {
        statusText.innerText = "Uploading and processing...";
        statusText.style.color = "orange";
    }

    try {
        // FIXED: Pointing explicitly to your target database route path: registeredassets
        const response = await fetch('http://127.0.0.1:8000/upload/registeredassets', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            if (statusText) statusText.innerText = `Success: ${data.message}`;
            if (statusText) statusText.style.color = "green";
            populateTableDropdown(); // Instantly update view selector grid lists
        } else {
            if (statusText) statusText.innerText = `Error: ${data.detail || "Upload failed"}`;
            if (statusText) statusText.style.color = "red";
        }
    } catch (error) {
        console.error("Network Error:", error);
        if (statusText) statusText.innerText = "Could not connect to the backend server.";
        if (statusText) statusText.style.color = "red";
    }
});

// POPULATE INTERACTIVE DROPDOWN MENU OPTIONS
async function populateTableDropdown() {
    const selector = document.getElementById('tableSelector');
    if (!selector) return;
    try {
        // FIXED: Requesting table lists directly from your target database route path
        const response = await fetch('http://127.0.0.1:8000/tables/registeredassets');
        const data = await response.json();
        
        selector.innerHTML = '<option value="">-- Choose a Table --</option>';
        
        if (data.tables) {
            data.tables.forEach(tableName => {
                const option = document.createElement('option');
                option.value = tableName;
                option.innerText = tableName;
                selector.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading tables list:", error);
    }
}

// FETCH INTERACTIVE GRID PREVIEW DATA ROWS
document.getElementById('loadTableBtn')?.addEventListener('click', async () => {
    const selectedTable = document.getElementById('tableSelector').value;
    const headerRow = document.getElementById('gridHeader');
    const bodyRows = document.getElementById('gridBody');
    
    if (!selectedTable) return alert("Please select a table first!");
    
    try {
        // FIXED: Appending database key registeredassets into path matching sequence
        const response = await fetch(`http://127.0.0.1:8000/tables/registeredassets/${selectedTable}`);
        const result = await response.json();
        const rowsData = result.data;
        
        if (headerRow) headerRow.innerHTML = "";
        if (bodyRows) bodyRows.innerHTML = "";
        
        if (!rowsData || rowsData.length === 0) {
            if (bodyRows) bodyRows.innerHTML = "<tr><td colspan='100%'>This table is currently empty.</td></tr>";
            return;
        }
        
        const columns = Object.keys(rowsData[0]);
        const trHeader = document.createElement('tr');
        columns.forEach(col => {
            const th = document.createElement('th');
            th.innerText = col.toUpperCase().replace(/_/g, " ");
            th.style.padding = "10px";
            trHeader.appendChild(th);
        });
        if (headerRow) headerRow.appendChild(trHeader);
        
        rowsData.forEach(row => {
            const trBody = document.createElement('tr');
            columns.forEach(col => {
                const td = document.createElement('td');
                td.innerText = row[col] !== null ? row[col] : "";
                td.style.padding = "10px";
                trBody.appendChild(td);
            });
            if (bodyRows) bodyRows.appendChild(trBody);
        });
        
    } catch (error) {
        console.error("Error loading table records:", error);
    }
});

// Run rendering execution when layout binds cleanly
window.addEventListener('DOMContentLoaded', populateTableDropdown);