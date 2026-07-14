/**
 * ====================================================================
 * 1. CONFIGURATION & STATE MANAGER REGISTRY
 * ====================================================================
 */
const BACKEND_BASE_URL = 'http://127.0.0.1:8000';

// Global hooks used to track active dynamic deletion targets
let activeDbTarget = "";
let activeTableTarget = "";

// UI Dom Elements Destructuring Registry
const DomElements = {
    // Navigational & Informational Nodes
    uploadStatus: document.getElementById('uploadstatus'),
    tableSelector: document.getElementById('tableSelector'),
    gridHeader: document.getElementById('gridHeader'),
    gridBody: document.getElementById('gridBody'),
    
    // Custom Master Password Entry Modal
    customDeleteModal: document.getElementById('custom-delete-modal'),
    modalWarningText: document.getElementById('modal-warning-text'),
    modalPasswordInput: document.getElementById('modal-password-input'),
    togglePasswordEye: document.getElementById('toggle-password-eye'),
    
    // Custom Universal Action Outcome Alert Box
    resultModal: document.getElementById('custom-result-modal'),
    resultIconContainer: document.getElementById('result-icon-container'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    resultCloseBtn: document.getElementById('result-close-btn')
};

/**
 * ====================================================================
 * 2. CORE NAVIGATION EVENT LISTENERS
 * ====================================================================
 */
const navMap = {
    'home': 'home.html',
    'assets-list': 'assets list.html',
    'inventory': 'inventory.html',
    'reports': 'reports.html',
    'find': 'inventory.html',
    'Register-Asset': 'register asset.html',
    'assests-list': 'assets list.html',
    'Register-New-User': 'register new user.html',
    'profilee': 'profile.html'
};

Object.entries(navMap).forEach(([id, targetPage]) => {
    document.getElementById(id)?.addEventListener("click", () => { 
        window.location.href = targetPage; 
    });
});

document.getElementById('log-out')?.addEventListener("click", () => {
    showResultModal(true, "Logging Out", "Log-Out Successful! Transferring back to security view.");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
});

/**
 * ====================================================================
 * 3. BUSINESS LOGIC: MULTI-DATABASE SHEET INGESTION PIPELINES
 * ====================================================================
 */
async function handleDataIngestion(fileInputId, dbTargetName) {
    const fileInput = document.getElementById(fileInputId);
    const statusText = DomElements.uploadStatus;
    
    if (!fileInput || fileInput.files.length === 0) {
        showResultModal(false, "Selection Warning", "Please select a spreadsheet file first before executing an upload.");
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    if (statusText) {
        statusText.innerText = `Uploading ${file.name} directly into ${dbTargetName}...`;
        statusText.style.color = "orange";
    }

    try {
        const response = await fetch(`${BACKEND_BASE_URL}/upload/${dbTargetName}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            if (statusText) {
                statusText.innerText = `Success: ${data.message}`;
                statusText.style.color = "green";
            }
            showResultModal(true, "Ingestion Complete", `Spreadsheet information mapped completely into your ${dbTargetName} schemas!`);
            fileInput.value = ""; 
            populateTableDropdown();
        } else {
            if (statusText) {
                statusText.innerText = `Error: ${data.detail || "Upload operation rejected."}`;
                statusText.style.color = "red";
            }
            showResultModal(false, "Ingestion Failure", data.detail || "Upload configuration parsed incorrectly.");
        }
    } catch (error) {
        console.error("Ingestion transmission error:", error);
        if (statusText) {
            statusText.innerText = "Could not establish connection with backend API server.";
            statusText.style.color = "red";
        }
    }
}

/**
 * ====================================================================
 * 4. BUSINESS LOGIC: INTERACTIVE REVIEWS & DROPDOWNS MATRICES
 * ====================================================================
 */
async function populateTableDropdown() {
    const selector = DomElements.tableSelector;
    if (!selector) return;
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/tables/registeredassets`);
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

document.getElementById('loadTableBtn')?.addEventListener('click', async () => {
    const selectedTable = DomElements.tableSelector?.value;
    const headerRow = DomElements.gridHeader;
    const bodyRows = DomElements.gridBody;
    
    if (!selectedTable) {
        showResultModal(false, "Precondition Missing", "Please select a database table track out of the menu first.");
        return;
    }
    
    try {
        const response = await fetch(`${BACKEND_BASE_URL}/tables/registeredassets/${selectedTable}`);
        const result = await response.json();
        const rowsData = result.data;
        
        if (headerRow) headerRow.innerHTML = "";
        if (bodyRows) bodyRows.innerHTML = "";
        
        if (!rowsData || rowsData.length === 0) {
            if (bodyRows) bodyRows.innerHTML = "<tr><td colspan='100%'>This chosen table is currently empty.</td></tr>";
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

/**
 * ====================================================================
 * 5. MODERN REUSABLE MODAL VIEW PORT HANDLERS (ANTI-ALERT FRAMEWORK)
 * ====================================================================
 */
function openPurgeModal(dbTargetName, tableName) {
    activeDbTarget = dbTargetName;
    activeTableTarget = tableName;

    if (DomElements.modalWarningText) {
        DomElements.modalWarningText.innerHTML = `Are you sure? You want to delete <strong>${dbTargetName}</strong> (${tableName})?<br><span style="color:#ff4d4d; font-size:13px;">This process is completely irreversible!</span>`;
    }
    if (DomElements.modalPasswordInput) DomElements.modalPasswordInput.value = ""; 
    if (DomElements.customDeleteModal) DomElements.customDeleteModal.style.display = "flex";    
}

function closePurgeModal() {
    if (DomElements.customDeleteModal) DomElements.customDeleteModal.style.display = "none";
    activeDbTarget = "";
    activeTableTarget = "";
}

function showResultModal(isSuccess, title, message) {
    const container = DomElements.resultIconContainer;
    const closeBtn = DomElements.resultCloseBtn;

    if (!DomElements.resultModal || !DomElements.resultTitle || !DomElements.resultMessage || !container) return;

    if (isSuccess) {
        container.innerHTML = `<i class="ri-checkbox-circle-line" style="color: #2ed573; font-size: 60px;"></i>`;
        if (closeBtn) closeBtn.style.backgroundColor = "#2ed573"; 
    } else {
        container.innerHTML = `<i class="ri-error-warning-line" style="color: #ff4d4d; font-size: 60px;"></i>`;
        if (closeBtn) closeBtn.style.backgroundColor = "#ff4d4d"; 
    }

    DomElements.resultTitle.innerText = title;
    DomElements.resultMessage.innerText = message;
    DomElements.resultModal.style.display = "flex";
}

function closeResultModal() {
    if (DomElements.resultModal) DomElements.resultModal.style.display = "none";
}

// SECURE ADMINISTRATIVE PURGE COMMAND DISPATCHER
document.getElementById('modal-confirm-btn')?.addEventListener('click', async () => {
    const specialPassword = DomElements.modalPasswordInput ? DomElements.modalPasswordInput.value.trim() : "";

    if (!specialPassword) {
        showResultModal(false, "Security Barrier", "Please enter the administrator master key verification password to proceed.");
        return;
    }

    try {
        const response = await fetch(`${BACKEND_BASE_URL}/api/purge-table/${activeDbTarget}/${activeTableTarget}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ security_key: specialPassword })
        });

        const result = await response.json();

        if (response.ok) {
            closePurgeModal();
            showResultModal(true, "Table Dropped", result.message || "Data partitions purged flawlessly out of storage.");
            populateTableDropdown();
        } else {
            closePurgeModal();
            showResultModal(false, "Access Revoked", result.detail || "Authentication verification checks crashed.");
        }
    } catch (error) {
        console.error("Purge transmission breakdown:", error);
        closePurgeModal();
        showResultModal(false, "Transmission Error", "Could not connect safely to the administrative credential module.");
    }
});

// Structural Dismissal Event Bindings
document.getElementById('modal-cancel-btn')?.addEventListener('click', closePurgeModal);
DomElements.customDeleteModal?.addEventListener('click', (e) => {
    if (e.target === DomElements.customDeleteModal) closePurgeModal(); 
});

DomElements.resultCloseBtn?.addEventListener('click', closeResultModal);
DomElements.resultModal?.addEventListener('click', (e) => {
    if (e.target === DomElements.resultModal) closeResultModal(); 
});

/**
 * ====================================================================
 * 6. APPARATUS SINK BUTTON INTERACTION ROUTERS
 * ====================================================================
 */
// File Input Ingestion Operations Click Wrappers
document.getElementById('uploadbtn-assets')?.addEventListener('click', () => handleDataIngestion('excelfile-assets', 'assets'));
document.getElementById('uploadbtn-inventory')?.addEventListener('click', () => handleDataIngestion('excelfile-inventory', 'registeredassets'));
document.getElementById('uploadbtn-employee')?.addEventListener('click', () => handleDataIngestion('excelfile-employee', 'employee'));

// Secure Deletion Systems Window Trigger Routers
document.getElementById('deletebtn-assets')?.addEventListener('click', () => openPurgeModal('assets', 'totalassets'));
document.getElementById('deletebtn-inventory')?.addEventListener('click', () => openPurgeModal('registeredassets', 'currentassets'));
document.getElementById('deletebtn-employee')?.addEventListener('click', () => openPurgeModal('employee', 'yamatoemployee'));

/**
 * ====================================================================
 * 7. UTILITIES & APPARATUS APPLICATION INITIALIZERS
 * ====================================================================
 */
function setupPasswordToggle() {
    const input = DomElements.modalPasswordInput;
    const eye = DomElements.togglePasswordEye;

    if (!input || !eye) return;

    eye.addEventListener('click', () => {
        const isMasked = input.getAttribute('type') === 'password';
        input.setAttribute('type', isMasked ? 'text' : 'password');
        eye.className = isMasked ? 'ri-eye-line' : 'ri-eye-off-line';
        eye.style.position = "absolute";
        eye.style.right = "12px";
        eye.style.top = "50%";
        eye.style.transform = "translateY(-50%)";
        eye.style.cursor = "pointer";
    });
}

// Unified Single initialization sequence trigger loop
window.addEventListener('DOMContentLoaded', () => {
    populateTableDropdown();
    setupPasswordToggle();
    loadProfileCredentials();
    setupPasswordReset();
});

/**
 * ====================================================================
 * 8. PROFILE CREDENTIALS DISPLAY
 * ====================================================================
 */
function loadProfileCredentials() {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;

    const user = JSON.parse(storedUser);
    const usernameInput = document.getElementById('profile-username');
    const passwordInput = document.getElementById('profile-password');
    const headingEl    = document.querySelector('#content h1');

    if (usernameInput && user.username) {
        usernameInput.value = user.username;
    }
    // Show masked dots for the password — never expose the real value in the DOM
    if (passwordInput) {
        passwordInput.value = '••••••••••••';
    }
    if (headingEl && user.username) {
        headingEl.innerText = `Hello, ${user.username} 👋`;
    }
}

/**
 * ====================================================================
 * 9. 2-STEP PASSWORD RESET MODAL ENGINE
 * ====================================================================
 */
function setupPasswordReset() {
    const step1Modal    = document.getElementById('reset-modal-step1');
    const step2Modal    = document.getElementById('reset-modal-step2');
    const step1Error    = document.getElementById('reset-step1-error');
    const step2Error    = document.getElementById('reset-step2-error');
    const currentPwIn   = document.getElementById('reset-current-pw');
    const newPwIn       = document.getElementById('reset-new-pw');
    const confirmPwIn   = document.getElementById('reset-confirm-pw');

    // --- Helper: show/hide a modal ---
    function openModal(el)  { if (el) el.style.display = 'flex'; }
    function closeModal(el) { if (el) el.style.display = 'none'; }

    // --- Helper: eye toggle for any password field ---
    function bindEyeToggle(eyeId, inputId) {
        const eye   = document.getElementById(eyeId);
        const input = document.getElementById(inputId);
        if (!eye || !input) return;
        eye.addEventListener('click', () => {
            const masked = input.type === 'password';
            input.type   = masked ? 'text' : 'password';
            eye.className = masked ? 'ri-eye-line' : 'ri-eye-off-line';
        });
    }
    bindEyeToggle('toggle-reset-current', 'reset-current-pw');
    bindEyeToggle('toggle-reset-new',     'reset-new-pw');
    bindEyeToggle('toggle-reset-confirm', 'reset-confirm-pw');

    // --- Open Step 1 when Reset button is clicked ---
    document.getElementById('change')?.addEventListener('click', () => {
        if (currentPwIn) currentPwIn.value = '';
        if (step1Error)  { step1Error.style.display = 'none'; step1Error.innerText = ''; }
        openModal(step1Modal);
    });

    // --- Close Step 1 on Cancel ---
    document.getElementById('reset-step1-cancel')?.addEventListener('click', () => closeModal(step1Modal));
    step1Modal?.addEventListener('click', (e) => { if (e.target === step1Modal) closeModal(step1Modal); });

    // --- Step 1: Verify current password via backend ---
    document.getElementById('reset-step1-confirm')?.addEventListener('click', async () => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            if (step1Error) { step1Error.innerText = 'Session expired. Please log in again.'; step1Error.style.display = 'block'; }
            return;
        }
        const user = JSON.parse(storedUser);
        const currentPw = currentPwIn ? currentPwIn.value.trim() : '';

        if (!currentPw) {
            if (step1Error) { step1Error.innerText = 'Please enter your current password.'; step1Error.style.display = 'block'; }
            return;
        }

        const confirmBtn = document.getElementById('reset-step1-confirm');
        confirmBtn.innerText = 'Verifying...';
        confirmBtn.disabled = true;

        try {
            // We verify by hitting change-password with an empty new_password sentinel
            // to check the current password — actually we call /api/login to verify identity
            const verifyRes = await fetch(`${BACKEND_BASE_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, password: currentPw })
            });

            if (verifyRes.ok) {
                // Store current password temporarily (in memory only) for Step 2
                window._resetCurrentPw = currentPw;
                closeModal(step1Modal);
                // Clear Step 2 fields
                if (newPwIn)     newPwIn.value = '';
                if (confirmPwIn) confirmPwIn.value = '';
                if (step2Error)  { step2Error.style.display = 'none'; step2Error.innerText = ''; }
                openModal(step2Modal);
            } else {
                const err = await verifyRes.json().catch(() => ({}));
                if (step1Error) {
                    step1Error.innerText = err.detail || 'Incorrect password. Please try again.';
                    step1Error.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Reset Step 1 error:', error);
            if (step1Error) { step1Error.innerText = 'Could not connect to server.'; step1Error.style.display = 'block'; }
        } finally {
            confirmBtn.innerText = 'Verify & Continue';
            confirmBtn.disabled = false;
        }
    });

    // --- Back to Step 1 from Step 2 ---
    document.getElementById('reset-step2-back')?.addEventListener('click', () => {
        closeModal(step2Modal);
        openModal(step1Modal);
    });
    step2Modal?.addEventListener('click', (e) => { if (e.target === step2Modal) closeModal(step2Modal); });

    // --- Step 2: Save new password ---
    document.getElementById('reset-step2-confirm')?.addEventListener('click', async () => {
        const newPw     = newPwIn     ? newPwIn.value.trim()     : '';
        const confirmPw = confirmPwIn ? confirmPwIn.value.trim() : '';

        if (!newPw) {
            if (step2Error) { step2Error.innerText = 'Please enter a new password.'; step2Error.style.display = 'block'; }
            return;
        }
        if (newPw !== confirmPw) {
            if (step2Error) { step2Error.innerText = 'Passwords do not match. Please try again.'; step2Error.style.display = 'block'; }
            return;
        }
        if (newPw.length < 6) {
            if (step2Error) { step2Error.innerText = 'Password must be at least 6 characters.'; step2Error.style.display = 'block'; }
            return;
        }

        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        const user = JSON.parse(storedUser);

        const saveBtn = document.getElementById('reset-step2-confirm');
        saveBtn.innerText = 'Saving...';
        saveBtn.disabled = true;

        try {
            const res = await fetch(`${BACKEND_BASE_URL}/api/change-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    current_password: window._resetCurrentPw || '',
                    new_password: newPw
                })
            });

            const result = await res.json().catch(() => ({}));

            if (res.ok) {
                window._resetCurrentPw = null;
                closeModal(step2Modal);
                showResultModal(true, 'Password Updated', 'Your password has been changed successfully. Please use the new password on your next login.');
            } else {
                if (step2Error) {
                    step2Error.innerText = result.detail || 'Failed to update password. Please try again.';
                    step2Error.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('Reset Step 2 error:', error);
            if (step2Error) { step2Error.innerText = 'Connection error. Please try again.'; step2Error.style.display = 'block'; }
        } finally {
            saveBtn.innerText = 'Save Password';
            saveBtn.disabled = false;
        }
    });
}