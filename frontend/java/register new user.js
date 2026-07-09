// SAFE SIDEBAR NAVIGATION LISTENERS
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

const post_url = 'http://127.0.0.1:8000/api/users/employee';

document.getElementById('register-user-form')?.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    // FIXED: Selecting values safely via name attributes without breaking your shared id="iinput" styles
    const employeeData = {
        empId: document.querySelector('[name="empId"]').value.trim(),
        name: document.querySelector('[name="empName"]').value.trim(),
        email: document.querySelector('[name="empEmail"]').value.trim(),
        mob_number: document.querySelector('[name="empMobile"]').value.trim(),
        department: document.querySelector('[name="empDept"]').value,
        designation: document.querySelector('[name="empDesg"]').value
    };

    if (!employeeData.empId || !employeeData.name || !employeeData.email) {
        alert("Please provide the required Employee ID, Name, and Email Address.");
        return;
    }

    try {
        const response = await fetch(post_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        const result = await response.json();

        if (response.ok) {
            alert('Employee record successfully saved to the employee database!');
            document.getElementById('register-user-form').reset(); 
            window.location.href = "assets list.html"; 
        } else {
            alert('Server Error: ' + JSON.stringify(result.detail || "Validation check failed."));
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Could not establish connection to the backend server.');
    }
});