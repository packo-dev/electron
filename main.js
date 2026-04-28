// ============================================================
// MAIN.JS — Processus principal (Main Process) d'Electron
// C'est le "chef d'orchestre" : il cree la fenetre,
// le menu, et gere toutes les requetes du Renderer via IPC.
// Lui seul a acces a Node.js, au systeme de fichiers, etc.
// ============================================================

const { app, BrowserWindow, ipcMain, Menu, Notification } = require('electron');
const path = require('path');

// On importe nos modules metier
const db = require('./database');       // Acces a la base SQLite
const auth = require('./auth');         // Inscription / Connexion (bcrypt + JWT)
const labyrinth = require('./labyrinth'); // Generation et resolution de labyrinthes
const admin = require('./admin');       // Fonctions d'administration

// Variable globale : la fenetre principale de l'application
let mainWindow;

// Variable globale : l'utilisateur actuellement connecte (null si deconnecte)
let currentUser = null;

// ─── CREATION DE LA FENETRE ────────────────────────────────
// Cette fonction cree la fenetre Electron avec les options de securite
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      // preload.js sert de "pont" entre Main et Renderer
      preload: path.join(__dirname, 'preload.js'),
      // SECURITE : ces 3 options sont OBLIGATOIRES
      contextIsolation: true,   // Isole le contexte JS du Renderer
      nodeIntegration: false,   // Interdit l'acces a Node.js depuis le Renderer
      sandbox: true             // Isolation maximale du processus
    }
  });

  // On charge notre page HTML dans la fenetre
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // On cree le menu natif de l'application
  createMenu();
}

// ─── MENU NATIF ────────────────────────────────────────────
// Menu.buildFromTemplate() cree un menu a partir d'un tableau
// Chaque element a un label (texte affiche) et soit un role, soit un click
function createMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Fichier',
      submenu: [
        { label: 'Quitter', role: 'quit' } // role = comportement automatique
      ]
    },
    {
      label: 'Edition',
      submenu: [
        { role: 'undo' },      // Annuler (Ctrl+Z)
        { role: 'redo' },      // Retablir (Ctrl+Shift+Z)
        { type: 'separator' }, // Ligne de separation
        { role: 'cut' },       // Couper
        { role: 'copy' },      // Copier
        { role: 'paste' },     // Coller
        { role: 'selectAll' }  // Tout selectionner
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload' },         // Recharger la page
        { role: 'toggleDevTools' },  // Ouvrir les outils de developpement
        { type: 'separator' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' }
      ]
    }
  ]);
  // On applique le menu a l'application
  Menu.setApplicationMenu(menu);
}

// ============================================================
//  IPC — AUTHENTIFICATION
//  Le Renderer envoie une requete via window.api.login(...)
//  Le preload la transmet ici via ipcRenderer.invoke('auth:login')
//  ipcMain.handle('auth:login') la traite et renvoie la reponse
// ============================================================

// --- INSCRIPTION ---
// Recoit : username, email, password depuis le formulaire
// Retourne : { success, token, user } ou { success: false, error }
ipcMain.handle('auth:register', async (event, username, email, password) => {
  try {
    const result = auth.register(username, email, password);
    currentUser = result.user; // On garde l'utilisateur en memoire
    // Notification native Windows/Mac qui apparait hors de la fenetre
    new Notification({ title: 'Bienvenue !', body: `Compte cree pour ${username}` }).show();
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- CONNEXION ---
// Recoit : username, password
// Retourne : { success, token, user } ou { success: false, error }
ipcMain.handle('auth:login', async (event, username, password) => {
  try {
    const result = auth.login(username, password);
    currentUser = result.user;
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- VERIFICATION DU TOKEN JWT ---
// Sert pour l'auto-login : on verifie si le token stocke est encore valide
ipcMain.handle('auth:verify', async (event, token) => {
  const decoded = auth.verifyToken(token);
  if (decoded) {
    currentUser = { id: decoded.id, username: decoded.username, role: decoded.role };
    return { success: true, user: currentUser };
  }
  return { success: false };
});

// ============================================================
//  IPC — CRUD LABYRINTHES
//  Create, Read, Update, Delete des labyrinthes
// ============================================================

// --- CREATE : Creer un nouveau labyrinthe ---
// Genere un labyrinthe et le sauvegarde en base pour l'utilisateur connecte
ipcMain.handle('laby:create', async (event, name, width, height, difficulty) => {
  try {
    if (!currentUser) return { success: false, error: 'Non connecte' };
    // 1. On genere le labyrinthe (algorithme DFS)
    const mazeData = labyrinth.generateMaze(width, height, difficulty);
    // 2. On le sauvegarde dans SQLite
    const result = db.createLabyrinthe(currentUser.id, name, width, height, difficulty, mazeData);
    return { success: true, id: result.lastInsertRowid, mazeData };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- READ : Lire tous les labyrinthes de l'utilisateur connecte ---
// Chaque utilisateur ne voit QUE ses propres labyrinthes
ipcMain.handle('laby:getAll', async () => {
  try {
    if (!currentUser) return { success: false, error: 'Non connecte' };
    const list = db.getLabyrinthesByUser(currentUser.id);
    return { success: true, labyrinthes: list };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- READ : Lire un labyrinthe par son ID ---
ipcMain.handle('laby:get', async (event, id) => {
  try {
    const laby = db.getLabyrintheById(id);
    if (!laby) return { success: false, error: 'Labyrinthe introuvable' };
    return { success: true, labyrinthe: laby };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- UPDATE : Modifier le nom d'un labyrinthe ---
ipcMain.handle('laby:update', async (event, id, name, mazeData) => {
  try {
    db.updateLabyrinthe(id, name, mazeData);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- DELETE : Supprimer un labyrinthe ---
ipcMain.handle('laby:delete', async (event, id) => {
  try {
    db.deleteLabyrinthe(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- GENERATION : Generer un labyrinthe sans le sauvegarder ---
// Utilise pour la preview avant de sauvegarder
ipcMain.handle('laby:generate', async (event, width, height, difficulty) => {
  try {
    const mazeData = labyrinth.generateMaze(width, height, difficulty);
    return { success: true, mazeData };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- RESOLUTION : Trouver le chemin le plus court (BFS) ---
ipcMain.handle('laby:solve', async (event, mazeData) => {
  try {
    const solutionPath = labyrinth.solveMaze(mazeData);
    return { success: true, path: solutionPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
//  IPC — ADMINISTRATION
//  Accessible uniquement si currentUser.role === 'admin'
// ============================================================

// --- Lister tous les utilisateurs ---
ipcMain.handle('admin:getUsers', async () => {
  try {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: 'Acces refuse' };
    return { success: true, users: admin.getAllUsers() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Creer un utilisateur (par l'admin) ---
ipcMain.handle('admin:createUser', async (event, username, email, password, role) => {
  try {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: 'Acces refuse' };
    admin.createUser(username, email, password, role);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Modifier un utilisateur ---
ipcMain.handle('admin:updateUser', async (event, id, username, email, role) => {
  try {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: 'Acces refuse' };
    admin.updateUser(id, username, email, role);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Supprimer un utilisateur et tous ses labyrinthes ---
ipcMain.handle('admin:deleteUser', async (event, id) => {
  try {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: 'Acces refuse' };
    admin.deleteUser(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Voir TOUS les labyrinthes de TOUS les utilisateurs ---
ipcMain.handle('admin:getAllLabyrinthes', async () => {
  try {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: 'Acces refuse' };
    return { success: true, labyrinthes: admin.getAllLabyrinthes() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Supprimer un labyrinthe (par l'admin) ---
ipcMain.handle('admin:deleteLabyrinthe', async (event, id) => {
  try {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: 'Acces refuse' };
    admin.deleteLabyrinthe(id);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- Statistiques globales ---
ipcMain.handle('admin:getStats', async () => {
  try {
    if (!currentUser || currentUser.role !== 'admin') return { success: false, error: 'Acces refuse' };
    return { success: true, stats: admin.getStats() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============================================================
//  CYCLE DE VIE DE L'APPLICATION
// ============================================================

// Quand Electron est pret, on initialise la base de donnees puis on cree la fenetre
app.whenReady().then(async () => {
  await db.initDatabase();
  createWindow();
});

// Quand toutes les fenetres sont fermees, on quitte l'app (sauf sur macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Sur macOS, si on clique sur l'icone du dock et qu'il n'y a pas de fenetre, on en recree une
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
