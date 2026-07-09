const fetchUsers = async () => {
    // CHANGED: Pointed to FastAPI route
    const response = await fetch('http://localhost:8000/api/users');
    const data = await response.json();
    console.log(data);
}

const loginForm = document.getElementById('login-form');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        // CHANGED: Pointed to FastAPI route
        const response = await fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            alert(data.message);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/frontend/html/home.html'; 
        } else {
            alert(data.message || "Invalid credentials");
        }
    } catch (error) {
        console.error('Connection error:', error);
        alert('Could not connect to the authentication server.');
    }
});