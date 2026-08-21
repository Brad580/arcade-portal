const BACKEND_URL = 'https://arcade-backend-l2kx.onrender.com';

const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const guestBtn = document.getElementById('guestBtn');
const createAccountBtn = document.getElementById('createAccountBtn');
const logoutBtn = document.getElementById('logoutBtn');
const signedInBanner = document.getElementById('signedInBanner');
const signedInUser = document.getElementById('signedInUser');
const loginPanelTitle = document.getElementById('loginPanelTitle');
const loginPanelText = document.getElementById('loginPanelText');
const themeButtons = document.querySelectorAll('.theme-switch');
const joystick = document.querySelector('.joystick');
const snakeLeaderboardPreview = document.getElementById('snakeLeaderboardPreview');
const dndLeaderboardPreview = document.getElementById('dndLeaderboardPreview');

function setStatus(message, isError = false) {
  if (!statusMessage) {
    return;
  }

  statusMessage.textContent = message;
  statusMessage.style.color = isError ? '#ff9de6' : '#ffe066';
}

function saveCurrentUser(username) {
  if (!username || !username.trim() || username.trim() === 'Player') {
    return;
  }

  localStorage.setItem('arcadeCurrentUser', username.trim());
}

function updateSignedInUi(username) {
  if (!signedInBanner || !signedInUser || !loginPanelTitle || !loginPanelText) {
    return;
  }

  const cleanUsername = typeof username === 'string' ? username.trim() : '';
  const hasRealUser = cleanUsername !== '' && cleanUsername !== 'Player';

  if (hasRealUser) {
    signedInBanner.classList.remove('hidden');
    signedInBanner.style.display = 'flex';
    signedInUser.textContent = cleanUsername;
    loginPanelTitle.textContent = 'Welcome Back';
    loginPanelText.textContent = 'You are already signed in. Jump back into the arcade or log out below.';
  } else {
    signedInBanner.classList.add('hidden');
    signedInBanner.style.display = 'none';
    signedInUser.textContent = 'Player';
    loginPanelTitle.textContent = 'Log In';
    loginPanelText.textContent = 'Sign in to access your saved games, scores, and profile.';
  }
}

function goToArcade() {
  document.body.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  document.body.style.opacity = '0';
  document.body.style.transform = 'scale(0.985)';

  setTimeout(function () {
    window.location.href = 'arcade.html';
  }, 350);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed.');
  }

  return data;
}

function renderLeaderboard(container, entries, emptyText, scoreLabel) {
  if (!container) {
    return;
  }

  if (!entries.length) {
    container.textContent = emptyText;
    return;
  }

  const topEntries = entries.slice(0, 3);
  container.innerHTML = `
    <ol>
      ${topEntries.map(entry => `<li><strong>${entry.username}</strong> — ${entry.score} ${scoreLabel}</li>`).join('')}
    </ol>
  `;
}

async function loadLeaderboardPreview() {
  const localSnakeLeaderboard = JSON.parse(localStorage.getItem('snakeLeaderboard') || '[]');
  const fallbackSnakeHighScore = Number(localStorage.getItem('snakeHighScore') || 0);
  const fallbackSnakeUser = localStorage.getItem('arcadeCurrentUser') || 'Guest';

  try {
    const snakeResult = await requestJson('/leaderboard/snake', { method: 'GET' });
    const backendSnakeEntries = snakeResult.leaderboard || [];

    if (backendSnakeEntries.length) {
      renderLeaderboard(
        snakeLeaderboardPreview,
        backendSnakeEntries,
        'No Snake scores yet.',
        'pts'
      );
    } else if (localSnakeLeaderboard.length) {
      renderLeaderboard(
        snakeLeaderboardPreview,
        localSnakeLeaderboard,
        'No Snake scores yet.',
        'pts'
      );
    } else if (fallbackSnakeHighScore > 0) {
      renderLeaderboard(
        snakeLeaderboardPreview,
        [{ username: fallbackSnakeUser, score: fallbackSnakeHighScore }],
        'No Snake scores yet.',
        'pts'
      );
    } else {
      renderLeaderboard(snakeLeaderboardPreview, [], 'No Snake scores yet.', 'pts');
    }
  } catch (_error) {
    if (localSnakeLeaderboard.length) {
      renderLeaderboard(
        snakeLeaderboardPreview,
        localSnakeLeaderboard,
        'No Snake scores yet.',
        'pts'
      );
    } else if (fallbackSnakeHighScore > 0) {
      renderLeaderboard(
        snakeLeaderboardPreview,
        [{ username: fallbackSnakeUser, score: fallbackSnakeHighScore }],
        'No Snake scores yet.',
        'pts'
      );
    } else {
      renderLeaderboard(snakeLeaderboardPreview, [], 'No Snake scores yet.', 'pts');
    }
  }

  const localDndLeaderboard = JSON.parse(localStorage.getItem('dndLeaderboard') || '[]');

  try {
    const dndResult = await requestJson('/leaderboard/dnd', { method: 'GET' });
    const backendDndEntries = dndResult.leaderboard || [];

    if (backendDndEntries.length) {
      renderLeaderboard(
        dndLeaderboardPreview,
        backendDndEntries,
        'No D&D runs yet.',
        'wins'
      );
    } else if (localDndLeaderboard.length) {
      renderLeaderboard(
        dndLeaderboardPreview,
        localDndLeaderboard,
        'No D&D runs yet.',
        'wins'
      );
    } else {
      renderLeaderboard(dndLeaderboardPreview, [], 'No D&D runs yet.', 'wins');
    }
  } catch (_error) {
    if (localDndLeaderboard.length) {
      renderLeaderboard(
        dndLeaderboardPreview,
        localDndLeaderboard,
        'No D&D runs yet.',
        'wins'
      );
    } else {
      renderLeaderboard(dndLeaderboardPreview, [], 'No D&D runs yet.', 'wins');
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value.trim() || '';

  if (!email || !password) {
    setStatus('Please enter both email and password.', true);
    return;
  }

  try {
    setStatus('Logging in...');
    const loginButton = loginForm?.querySelector('button[type="submit"]');
    if (loginButton) {
      loginButton.disabled = true;
    }

    const result = await requestJson('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    saveCurrentUser(result.user?.username || email.split('@')[0]);
    updateSignedInUi(result.user?.username || email.split('@')[0]);
    setStatus('Entering arcade...');
    goToArcade();
  } catch (error) {
    const loginButton = loginForm?.querySelector('button[type="submit"]');
    if (loginButton) {
      loginButton.disabled = false;
    }

    setStatus(error.message || 'Login failed.', true);
  }
}

async function handleCreateAccount() {
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value.trim() || '';

  if (!email || !password) {
    setStatus('Enter an email and password first, then create an account.', true);
    return;
  }

  const suggestedUsername = email.split('@')[0] || 'player';
  const promptedUsername = window.prompt('Choose a username:', suggestedUsername);
  const username = (promptedUsername && promptedUsername.trim())
    ? promptedUsername.trim()
    : suggestedUsername;

  try {
    setStatus('Creating account...');
    if (createAccountBtn) {
      createAccountBtn.disabled = true;
    }

    const result = await requestJson('/signup', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    saveCurrentUser(result.user?.username || username);
    updateSignedInUi(result.user?.username || username);
    setStatus('Account created. Entering arcade...');
    goToArcade();
  } catch (error) {
    if (createAccountBtn) {
      createAccountBtn.disabled = false;
    }

    setStatus(error.message || 'Account creation failed.', true);
  }
}

async function checkExistingSession() {
  const storedUser = localStorage.getItem('arcadeCurrentUser') || '';

  try {
    const result = await requestJson('/me', { method: 'GET' });

    if (result.user?.username && result.user.username.trim()) {
      saveCurrentUser(result.user.username);
      updateSignedInUi(result.user.username);
    } else if (storedUser && storedUser.trim() && storedUser.trim() !== 'Player') {
      updateSignedInUi(storedUser);
    } else {
      localStorage.removeItem('arcadeCurrentUser');
      updateSignedInUi('');
    }
  } catch (_error) {
    if (storedUser && storedUser.trim() && storedUser.trim() !== 'Player') {
      updateSignedInUi(storedUser);
    } else {
      localStorage.removeItem('arcadeCurrentUser');
      updateSignedInUi('');
    }
  }
}

function applyTheme(theme) {
  document.body.classList.remove('theme-pink', 'theme-yellow', 'theme-blue');
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem('arcadeTheme', theme);
}

if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

if (createAccountBtn) {
  createAccountBtn.addEventListener('click', handleCreateAccount);
}

if (guestBtn) {
  guestBtn.addEventListener('click', function () {
    localStorage.setItem('arcadeCurrentUser', 'Guest');
    updateSignedInUi('Guest');
    goToArcade();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async function () {
    try {
      await requestJson('/logout', { method: 'POST' });
    } catch (_error) {
      // Ignore logout request failures and still clear local state.
    }

    localStorage.removeItem('arcadeCurrentUser');
    sessionStorage.removeItem('arcadeCurrentUser');
    updateSignedInUi('');
    setStatus('Logged out.');
    window.location.reload();
  });
}

document.addEventListener('click', function (event) {
  const arcadeButton = event.target.closest('[data-enter-arcade]');
  if (arcadeButton) {
    const existingUser = localStorage.getItem('arcadeCurrentUser') || 'Guest';
    saveCurrentUser(existingUser);
    goToArcade();
  }
});

themeButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    applyTheme(button.dataset.theme);
  });
});

if (joystick) {
  joystick.addEventListener('click', function () {
    const themes = ['pink', 'yellow', 'blue'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];

    applyTheme(randomTheme);

    joystick.style.transform = 'scale(0.85)';
    setTimeout(function () {
      joystick.style.transform = 'scale(1)';
    }, 120);
  });

  joystick.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      joystick.click();
    }
  });
}

const savedTheme = localStorage.getItem('arcadeTheme');
if (savedTheme) {
  document.body.classList.add(`theme-${savedTheme}`);
}

updateSignedInUi(localStorage.getItem('arcadeCurrentUser') || '');
checkExistingSession();
loadLeaderboardPreview();