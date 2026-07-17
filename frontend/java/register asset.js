// SAFE SIDEBAR NAVIGATION LISTENERS
document.getElementById('home')?.addEventListener("click", () => { window.location.href = "/home"; });
document.getElementById('assets-list')?.addEventListener("click", () => { window.location.href = "/assets-list"; });
document.getElementById('inventory')?.addEventListener("click", () => { window.location.href = "/inventory"; });
document.getElementById('reports')?.addEventListener("click", () => { window.location.href = "/reports"; });
document.getElementById('log-out')?.addEventListener("click", () => {
    alert("Log-Out Successful! Back to login page. ");
    window.location.href = "/login"; 
});
document.getElementById('find')?.addEventListener("click", () => { window.location.href = "/inventory"; });
document.getElementById('Register-Asset')?.addEventListener("click", () => { window.location.href = "/register-asset"; });
document.getElementById('assests-list')?.addEventListener("click", () => { window.location.href = "/assets-list"; });
document.getElementById('Register-New-User')?.addEventListener("click", () => { window.location.href = "/register-user"; });
document.getElementById('profilee')?.addEventListener("click", () => { window.location.href = "/profile"; });

// TARGET: Set up the correct endpoint for your registration ledger pipeline
const post_url = '/api/regAssets';

document.getElementById('register-asset-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); // Stop standard browser page reload behavior

    // Collect the inputs matching the backend schema rules
    const assetData = {
        name: document.getElementById('asset-name').value.trim(),
        serialNo: document.getElementById('asset-serial').value.trim(),
        purchase_date: document.getElementById('asset-date').value,
        asset_type: document.getElementById('asset-type').value.trim(),
        status: document.getElementById('asset-status').value,
        Remarks: document.getElementById('iinputt').value.trim()
    };

    // Quick frontend sanity check
    if (!assetData.name || !assetData.serialNo || !assetData.status) {
        alert("Please fill out all mandatory fields (Name, Serial Number, and Status).");
        return;
    }

    try {
        const response = await fetch(post_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(assetData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Asset successfully registered in the ledger!');
            document.getElementById('register-asset-form').reset(); // Clear input boxes
            window.location.href = "/assets-list"; // Redirect the operator to see the list
        } else {
            alert('Server Error: ' + JSON.stringify(result.detail || result.message));
        }
    } catch (error) {
        console.error('Registration communication breakdown:', error);
        alert('Could not establish connection to the asset backend application.');
    }
});