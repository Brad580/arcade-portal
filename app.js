const BACKEND_URL = 'http://localhost:3000';

const loginForm = document.getElementById('loginForm');
const statusMessage = document.getElementById('statusMessage');
const guestBtn = document.getElementById('guestBtn');
const createAccountBtn = document.getElementById('createAccountBtn');
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
  if (!username) {
    return;
  }

  localStorage.setItem('arcadeCurrentUser', username);
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
  try {
    const result = await requestJson('/me', { method: 'GET' });

    if (result.user?.username) {
      saveCurrentUser(result.user.username);
    }
  } catch (_error) {
    // Ignore session check failures on first load.
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
    goToArcade();
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

checkExistingSession();
loadLeaderboardPreview();