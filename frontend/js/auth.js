const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const formTitle = document.getElementById('form-title');
const alertBox = document.getElementById('alert-box');

let isLoginMode = true;

// Zaten giriş yapılmışsa doğrudan ana listeye yönlendir
if (localStorage.getItem('token')) {
    window.location.href = 'dashboard.html';
}

function showAlert(message, type = 'error') {
    alertBox.textContent = message; // XSS koruması için textContent
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
}

// Giriş ve Kayıt formları arasında geçiş
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    alertBox.style.display = 'none';

    if (isLoginMode) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        formTitle.textContent = 'Kullanıcı Girişi';
        toggleText.textContent = 'Hesabınız yok mu?';
        toggleLink.textContent = 'Kayıt Olun';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        formTitle.textContent = 'Yeni Hesap Oluştur';
        toggleText.textContent = 'Zaten hesabınız var mı?';
        toggleLink.textContent = 'Giriş Yapın';
    }
});

// Giriş İşlemi (POST /api/auth/login)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            showAlert(data.message || 'Giriş başarısız oldu.');
            return;
        }

        // JWT Token ve kullanıcı bilgilerini tarayıcıda sakla
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = 'dashboard.html';
    } catch (err) {
        showAlert('Sunucuya bağlanılamadı.');
    }
});

// Kayıt İşlemi (POST /api/auth/register)
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email, password })
        });
        const data = await res.json();

        if (!res.ok) {
            const errMsg = data.errors ? data.errors[0].msg : data.message;
            showAlert(errMsg || 'Kayıt işlemi başarısız.');
            return;
        }

        showAlert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.', 'success');
        toggleLink.click(); // Otomatik olarak giriş ekranına geçir
        document.getElementById('login-email').value = email;
    } catch (err) {
        showAlert('Sunucuya bağlanılamadı.');
    }
});