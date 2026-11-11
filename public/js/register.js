const form = document.getElementById('register-form');
const errorBox = document.getElementById('error');
const submitButton = document.getElementById('submit');

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add('visible');
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.remove('visible');
}

function validate(username, email, password) {
  if (!username || !email || !password) return 'All fields are required.';
  if (!/^[a-z0-9]{1,20}$/.test(username)) {
    return 'Username can only contain letters and numbers (max 20).';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least 1 uppercase, 1 lowercase and 1 number.';
  }
  if (password.toLowerCase().includes('passw') || password.includes('1234')) {
    return 'Password is too common.';
  }
  return '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const username = document.getElementById('username').value.trim().toLowerCase();
  const email = document.getElementById('email').value.trim().toLowerCase();
  const password = document.getElementById('password').value;

  const problem = validate(username, email, password);
  if (problem) {
    showError(problem);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Creating account…';

  try {
    const response = await fetch('/registerData', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ user: username, email, pass: password }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      showError(data.error || 'Could not create the account. Please try again.');
      return;
    }

    window.location.assign('/js/done.html');
  } catch {
    showError('Could not reach the server. Check your connection and try again.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Create account';
  }
});

form.addEventListener('input', clearError);
