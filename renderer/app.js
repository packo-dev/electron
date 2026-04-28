// ============================================================
// APP.JS — Logique frontend (Renderer Process)
// Style retro terminal — communication via window.api (preload.js)
// ============================================================

let currentUser = null;
let currentToken = null;
let currentMazeData = null;
let currentViewMaze = null;
let currentSolution = null;
let currentSize = 'medium';

// ─── INITIALISATION ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initCreate();
  initAdmin();
  initModal();
  autoLogin();
});

// ─── NAVIGATION ENTRE PAGES ────────────────────────────────
function goToPage(pageId) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.add('hidden');
    p.classList.remove('active');
  });
  const page = document.getElementById('page-' + pageId);
  if (page) {
    page.classList.remove('hidden');
    page.classList.add('active');
  }

  if (pageId === 'dashboard') loadDashboard();
  if (pageId === 'admin') loadAdminData();
}

// ─── TOAST (notification en bas de l'ecran) ────────────────
function showToast(msg, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (isError ? ' error' : '');
  setTimeout(() => toast.classList.add('hidden'), 2500);
}

// ─── AUTO-LOGIN ────────────────────────────────────────────
async function autoLogin() {
  const token = localStorage.getItem('token');
  if (!token) return;
  const res = await window.api.verifyToken(token);
  if (res.success) {
    currentToken = token;
    currentUser = res.user;
    showMainApp();
  }
}

// ============================================================
//  AUTHENTIFICATION
// ============================================================
function initAuth() {
  // Onglets Connexion / Inscription
  document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-register').classList.remove('active');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
  });
  document.getElementById('tab-register').addEventListener('click', () => {
    document.getElementById('tab-register').classList.add('active');
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('login-form').classList.add('hidden');
  });

  document.getElementById('btn-login').addEventListener('click', handleLogin);
  document.getElementById('btn-register').addEventListener('click', handleRegister);

  document.getElementById('login-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
  document.getElementById('reg-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleRegister();
  });

  // Deconnexion
  document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('token');
    currentUser = null;
    currentToken = null;
    document.querySelectorAll('.page').forEach(p => {
      p.classList.add('hidden');
      p.classList.remove('active');
    });
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('auth-page').classList.add('active');
  });
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  if (!username || !password) { errEl.textContent = 'REMPLIR TOUS LES CHAMPS'; return; }

  const res = await window.api.login(username, password);
  if (res.success) {
    currentToken = res.token;
    currentUser = res.user;
    localStorage.setItem('token', res.token);
    errEl.textContent = '';
    showMainApp();
  } else {
    errEl.textContent = res.error.toUpperCase();
  }
}

async function handleRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');

  if (!username || !email || !password) { errEl.textContent = 'REMPLIR TOUS LES CHAMPS'; return; }
  if (password.length < 4) { errEl.textContent = 'MOT DE PASSE TROP COURT (MIN 4)'; return; }

  const res = await window.api.register(username, email, password);
  if (res.success) {
    currentToken = res.token;
    currentUser = res.user;
    localStorage.setItem('token', res.token);
    errEl.textContent = '';
    showMainApp();
  } else {
    errEl.textContent = res.error.toUpperCase();
  }
}

function showMainApp() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('auth-page').classList.remove('active');

  document.getElementById('user-greeting').textContent = currentUser.username;

  if (currentUser.role === 'admin') {
    document.getElementById('btn-nav-admin').hidden = false;
  } else {
    document.getElementById('btn-nav-admin').hidden = true;
  }

  goToPage('dashboard');
}

// ============================================================
//  DASHBOARD
// ============================================================
async function loadDashboard() {
  const res = await window.api.getLabyrinthes();
  if (!res.success) return;

  const labys = res.labyrinthes;
  document.getElementById('stat-total').textContent = labys.length;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = labys.filter(l => new Date(l.created_at).getTime() > oneWeekAgo);
  document.getElementById('stat-recent').textContent = recent.length;

  const container = document.getElementById('labyrinth-list');
  container.innerHTML = '';

  if (labys.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>AUCUN LABYRINTHE</p><p class="empty-sub">Cree ton premier !</p></div>';
    return;
  }

  labys.forEach(l => container.appendChild(createLabyCard(l)));

  // Bouton nouveau labyrinthe
  document.getElementById('btn-new-laby').onclick = () => goToPage('create');
}

function createLabyCard(laby) {
  const card = document.createElement('div');
  card.className = 'lab-card';

  const date = new Date(laby.created_at).toLocaleDateString('fr-FR');
  card.innerHTML = `
    <div class="lab-card-name">${escapeHtml(laby.name)}</div>
    <div class="lab-card-meta">${laby.width}x${laby.height} | DIFF ${laby.difficulty}/10 | ${date}</div>
    <canvas class="card-canvas" data-id="${laby.id}"></canvas>
    <div class="lab-card-actions">
      <button class="btn-icon small btn-card-view" data-id="${laby.id}">OUVRIR</button>
      <button class="btn-icon small danger btn-card-delete" data-id="${laby.id}">SUPPR</button>
    </div>
  `;

  card.querySelector('.btn-card-view').addEventListener('click', (e) => {
    e.stopPropagation();
    viewLabyrinthe(laby);
  });

  card.querySelector('.btn-card-delete').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('SUPPRIMER CE LABYRINTHE ?')) {
      await window.api.deleteLabyrinthe(laby.id);
      showToast('LABYRINTHE SUPPRIME');
      loadDashboard();
    }
  });

  requestAnimationFrame(() => {
    const canvas = card.querySelector('canvas');
    if (canvas) {
      const mazeData = JSON.parse(laby.maze_data);
      drawMazeOnCanvas(canvas, mazeData, 150);
    }
  });

  return card;
}

// ============================================================
//  VIEW LABYRINTHE
// ============================================================
function viewLabyrinthe(laby) {
  currentViewMaze = laby;
  currentSolution = null;
  goToPage('view');

  document.getElementById('view-title').textContent = laby.name;
  document.getElementById('view-size').textContent = 'TAILLE: ' + laby.width + 'x' + laby.height;
  document.getElementById('view-difficulty').textContent = 'DIFF: ' + laby.difficulty + '/10';
  document.getElementById('view-date').textContent = new Date(laby.created_at).toLocaleDateString('fr-FR');

  const canvas = document.getElementById('view-canvas');
  const mazeData = JSON.parse(laby.maze_data);
  drawMazeOnCanvas(canvas, mazeData, 500);

  document.getElementById('btn-view-edit').onclick = () => {
    showModal('RENOMMER', `
      <div class="field-group">
        <label>NOUVEAU NOM</label>
        <input type="text" id="modal-laby-name" value="${escapeHtml(laby.name)}" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
      </div>
    `, async () => {
      const newName = document.getElementById('modal-laby-name').value.trim();
      if (!newName) return;
      const res = await window.api.updateLabyrinthe(laby.id, newName, mazeData);
      if (res.success) {
        laby.name = newName;
        document.getElementById('view-title').textContent = newName;
        closeModal();
        showToast('LABYRINTHE RENOMME');
      }
    });
  };

  document.getElementById('btn-view-solve').onclick = async () => {
    const res = await window.api.solveMaze(mazeData);
    if (res.success) {
      currentSolution = res.path;
      drawMazeOnCanvas(canvas, mazeData, 500, res.path);
      showToast('CHEMIN TROUVE — ' + res.path.length + ' CASES');
    }
  };

  document.getElementById('btn-view-delete').onclick = async () => {
    if (confirm('SUPPRIMER CE LABYRINTHE ?')) {
      await window.api.deleteLabyrinthe(laby.id);
      showToast('LABYRINTHE SUPPRIME');
      goToPage('dashboard');
    }
  };

  document.getElementById('btn-view-back').onclick = () => goToPage('dashboard');
}

// ============================================================
//  CREATION DE LABYRINTHE
// ============================================================
function initCreate() {
  document.getElementById('btn-new-laby').addEventListener('click', () => goToPage('create'));
  document.getElementById('btn-create-back').addEventListener('click', () => goToPage('dashboard'));

  // Slider difficulte
  const diffSlider = document.getElementById('laby-difficulty');
  diffSlider.addEventListener('input', () => {
    document.getElementById('diff-display').textContent = diffSlider.value;
  });

  // Boutons taille S / M / L
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = btn.dataset.size;
    });
  });

  // Bouton GENERER
  document.getElementById('btn-generate').addEventListener('click', async () => {
    const difficulty = parseInt(diffSlider.value);
    let w, h;
    switch (currentSize) {
      case 'small':  w = 10; h = 10; break;
      case 'medium': w = 20; h = 20; break;
      case 'large':  w = 30; h = 30; break;
      default:       w = 20; h = 20;
    }

    const res = await window.api.generateMaze(w, h, difficulty);
    if (res.success) {
      currentMazeData = res.mazeData;
      currentSolution = null;
      drawMazeOnCanvas(document.getElementById('maze-canvas'), currentMazeData, 500);
      document.getElementById('btn-solve').disabled = false;
      document.getElementById('btn-save').disabled = false;
      showToast('LABYRINTHE GENERE');
    }
  });

  // Bouton RESOUDRE
  document.getElementById('btn-solve').addEventListener('click', async () => {
    if (!currentMazeData) return;
    const res = await window.api.solveMaze(currentMazeData);
    if (res.success) {
      currentSolution = res.path;
      drawMazeOnCanvas(document.getElementById('maze-canvas'), currentMazeData, 500, res.path);
      showToast('CHEMIN TROUVE — ' + res.path.length + ' CASES');
    }
  });

  // Bouton SAUVEGARDER
  document.getElementById('btn-save').addEventListener('click', async () => {
    if (!currentMazeData) return;
    const name = document.getElementById('laby-name').value.trim() || 'MON_LABYRINTHE';
    const difficulty = parseInt(diffSlider.value);
    let w, h;
    switch (currentSize) {
      case 'small':  w = 10; h = 10; break;
      case 'medium': w = 20; h = 20; break;
      case 'large':  w = 30; h = 30; break;
      default:       w = 20; h = 20;
    }

    const res = await window.api.createLabyrinthe(name, w, h, difficulty);
    if (res.success) {
      showToast('LABYRINTHE SAUVEGARDE');
      document.getElementById('btn-save').disabled = true;
    }
  });
}

// ============================================================
//  DESSIN DU LABYRINTHE SUR CANVAS
// ============================================================
function drawMazeOnCanvas(canvas, mazeData, maxSize, solutionPath) {
  const { grid, rows, cols, start, end } = mazeData;
  const cellSize = Math.floor(maxSize / Math.max(rows, cols));
  const width = cols * cellSize;
  const height = rows * cellSize;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // Fond noir
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, width, height);

  // Chemin de resolution (violet neon)
  if (solutionPath && solutionPath.length > 0) {
    ctx.fillStyle = 'rgba(170, 136, 255, 0.2)';
    solutionPath.forEach(p => {
      ctx.fillRect(p.col * cellSize, p.row * cellSize, cellSize, cellSize);
    });

    ctx.strokeStyle = '#aa88ff';
    ctx.shadowColor = '#aa88ff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = Math.max(2, cellSize / 4);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    solutionPath.forEach((p, i) => {
      const x = p.col * cellSize + cellSize / 2;
      const y = p.row * cellSize + cellSize / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Case depart (vert neon)
  ctx.fillStyle = '#00cc66';
  ctx.shadowColor = '#00cc66';
  ctx.shadowBlur = 6;
  ctx.fillRect(start.col * cellSize + 2, start.row * cellSize + 2, cellSize - 4, cellSize - 4);
  ctx.shadowBlur = 0;

  // Case arrivee (rouge neon)
  ctx.fillStyle = '#ff1133';
  ctx.shadowColor = '#ff1133';
  ctx.shadowBlur = 6;
  ctx.fillRect(end.col * cellSize + 2, end.row * cellSize + 2, cellSize - 4, cellSize - 4);
  ctx.shadowBlur = 0;

  // Murs (gris)
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellSize;
      const y = r * cellSize;
      const cell = grid[r][c];

      if (cell.top)    { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.stroke(); }
      if (cell.right)  { ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
      if (cell.bottom) { ctx.beginPath(); ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
      if (cell.left)   { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellSize); ctx.stroke(); }
    }
  }
}

// ============================================================
//  ADMINISTRATION
// ============================================================
function initAdmin() {
  document.getElementById('btn-admin-back').addEventListener('click', () => goToPage('dashboard'));

  // Onglets admin
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });

  // Bouton ajouter utilisateur
  document.getElementById('btn-admin-add-user').addEventListener('click', () => {
    showModal('AJOUTER UTILISATEUR', `
      <div class="field-group">
        <label>PSEUDO</label>
        <input type="text" id="modal-username" placeholder="PLAYER" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
      </div>
      <div class="field-group">
        <label>EMAIL</label>
        <input type="email" id="modal-email" placeholder="email@mail.com" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
      </div>
      <div class="field-group">
        <label>MOT DE PASSE</label>
        <input type="password" id="modal-password" placeholder="••••••••" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
      </div>
      <div class="field-group">
        <label>ROLE</label>
        <select id="modal-role" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
          <option value="user">UTILISATEUR</option>
          <option value="admin">ADMINISTRATEUR</option>
        </select>
      </div>
    `, async () => {
      const username = document.getElementById('modal-username').value.trim();
      const email = document.getElementById('modal-email').value.trim();
      const password = document.getElementById('modal-password').value;
      const role = document.getElementById('modal-role').value;
      if (!username || !email || !password) return;

      const res = await window.api.adminCreateUser(username, email, password, role);
      if (res.success) {
        closeModal();
        loadAdminData();
        showToast('UTILISATEUR CREE');
      }
    });
  });
}

async function loadAdminData() {
  // Stats
  const statsRes = await window.api.adminGetStats();
  if (statsRes.success) {
    document.getElementById('admin-stat-users').textContent = statsRes.stats.totalUsers;
    document.getElementById('admin-stat-labys').textContent = statsRes.stats.totalLabyrinthes;
  }

  // Users
  const usersRes = await window.api.adminGetUsers();
  if (usersRes.success) {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';
    usersRes.users.forEach(user => {
      const tr = document.createElement('tr');
      const date = new Date(user.created_at).toLocaleDateString('fr-FR');
      tr.innerHTML = `
        <td>${user.id}</td>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.email)}</td>
        <td>${user.role.toUpperCase()}</td>
        <td>${date}</td>
        <td>
          <button class="btn-icon small btn-edit-user" data-id="${user.id}">EDIT</button>
          <button class="btn-icon small danger btn-del-user" data-id="${user.id}">SUPPR</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-edit-user').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = parseInt(btn.dataset.id);
        const user = usersRes.users.find(u => u.id === userId);
        if (!user) return;
        showModal('MODIFIER UTILISATEUR', `
          <div class="field-group">
            <label>PSEUDO</label>
            <input type="text" id="modal-username" value="${escapeHtml(user.username)}" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
          </div>
          <div class="field-group">
            <label>EMAIL</label>
            <input type="email" id="modal-email" value="${escapeHtml(user.email)}" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
          </div>
          <div class="field-group">
            <label>ROLE</label>
            <select id="modal-role" style="font-family:var(--font);font-size:.75rem;padding:.85rem;background:var(--bg-3);color:var(--white);border:1px solid var(--grey-2);width:100%;">
              <option value="user" ${user.role==='user'?'selected':''}>UTILISATEUR</option>
              <option value="admin" ${user.role==='admin'?'selected':''}>ADMINISTRATEUR</option>
            </select>
          </div>
        `, async () => {
          const username = document.getElementById('modal-username').value.trim();
          const email = document.getElementById('modal-email').value.trim();
          const role = document.getElementById('modal-role').value;
          if (!username || !email) return;
          const result = await window.api.adminUpdateUser(userId, username, email, role);
          if (result.success) { closeModal(); loadAdminData(); showToast('UTILISATEUR MODIFIE'); }
        });
      });
    });

    document.querySelectorAll('.btn-del-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('SUPPRIMER CET UTILISATEUR ?')) {
          await window.api.adminDeleteUser(parseInt(btn.dataset.id));
          loadAdminData();
          showToast('UTILISATEUR SUPPRIME');
        }
      });
    });
  }

  // Labyrinthes
  const labsRes = await window.api.adminGetAllLabyrinthes();
  if (labsRes.success) {
    const tbody = document.querySelector('#admin-labys-table tbody');
    tbody.innerHTML = '';
    labsRes.labyrinthes.forEach(l => {
      const tr = document.createElement('tr');
      const date = new Date(l.created_at).toLocaleDateString('fr-FR');
      tr.innerHTML = `
        <td>${l.id}</td>
        <td>${escapeHtml(l.name)}</td>
        <td>${escapeHtml(l.username)}</td>
        <td>${l.width}x${l.height}</td>
        <td>${l.difficulty}/10</td>
        <td>${date}</td>
        <td><button class="btn-icon small danger btn-admin-del-lab" data-id="${l.id}">SUPPR</button></td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-admin-del-lab').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('SUPPRIMER CE LABYRINTHE ?')) {
          await window.api.adminDeleteLabyrinthe(parseInt(btn.dataset.id));
          loadAdminData();
          showToast('LABYRINTHE SUPPRIME');
        }
      });
    });
  }
}

// ============================================================
//  MODALE
// ============================================================
let modalConfirmCallback = null;

function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('modal-confirm').addEventListener('click', () => {
    if (modalConfirmCallback) modalConfirmCallback();
  });
}

function showModal(title, bodyHtml, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
  modalConfirmCallback = onConfirm;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  modalConfirmCallback = null;
}

// ============================================================
//  UTILITAIRE
// ============================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
