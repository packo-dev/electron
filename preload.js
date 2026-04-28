// ============================================================
// PRELOAD.JS — Le pont securise entre Main et Renderer
//
// Ce fichier est le SEUL qui peut communiquer avec les deux cotes.
// Il utilise contextBridge pour exposer des fonctions au Renderer
// via l'objet window.api, sans jamais donner acces a Node.js.
//
// Exemple : dans le Renderer, on appelle window.api.login(...)
//           qui envoie un message IPC au Main Process
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

// contextBridge.exposeInMainWorld('api', { ... })
// Cree un objet window.api accessible dans le Renderer
// Chaque fonction utilise ipcRenderer.invoke() pour envoyer un message au Main
// et attendre sa reponse (c'est une Promise, donc on utilise async/await)
contextBridge.exposeInMainWorld('api', {

  // ─── AUTHENTIFICATION ──────────────────────────────────
  // Inscription : envoie username, email, password au Main
  register: (username, email, password) =>
    ipcRenderer.invoke('auth:register', username, email, password),

  // Connexion : envoie username, password au Main
  login: (username, password) =>
    ipcRenderer.invoke('auth:login', username, password),

  // Verification du token JWT pour l'auto-login
  verifyToken: (token) =>
    ipcRenderer.invoke('auth:verify', token),

  // ─── CRUD LABYRINTHES ──────────────────────────────────
  // C = Create : creer un labyrinthe
  createLabyrinthe: (name, width, height, difficulty) =>
    ipcRenderer.invoke('laby:create', name, width, height, difficulty),

  // R = Read : lire tous mes labyrinthes
  getLabyrinthes: () =>
    ipcRenderer.invoke('laby:getAll'),

  // R = Read : lire un labyrinthe par son ID
  getLabyrinthe: (id) =>
    ipcRenderer.invoke('laby:get', id),

  // U = Update : modifier un labyrinthe (nom)
  updateLabyrinthe: (id, name, mazeData) =>
    ipcRenderer.invoke('laby:update', id, name, mazeData),

  // D = Delete : supprimer un labyrinthe
  deleteLabyrinthe: (id) =>
    ipcRenderer.invoke('laby:delete', id),

  // ─── GENERATION & RESOLUTION ───────────────────────────
  // Generer un labyrinthe (sans le sauvegarder, juste pour la preview)
  generateMaze: (width, height, difficulty) =>
    ipcRenderer.invoke('laby:generate', width, height, difficulty),

  // Resoudre un labyrinthe (trouver le chemin le plus court)
  solveMaze: (mazeData) =>
    ipcRenderer.invoke('laby:solve', mazeData),

  // ─── ADMINISTRATION (reserve aux admins) ───────────────
  // Lister tous les utilisateurs
  adminGetUsers: () =>
    ipcRenderer.invoke('admin:getUsers'),

  // Creer un utilisateur
  adminCreateUser: (username, email, password, role) =>
    ipcRenderer.invoke('admin:createUser', username, email, password, role),

  // Modifier un utilisateur
  adminUpdateUser: (id, username, email, role) =>
    ipcRenderer.invoke('admin:updateUser', id, username, email, role),

  // Supprimer un utilisateur
  adminDeleteUser: (id) =>
    ipcRenderer.invoke('admin:deleteUser', id),

  // Voir tous les labyrinthes (de tous les utilisateurs)
  adminGetAllLabyrinthes: () =>
    ipcRenderer.invoke('admin:getAllLabyrinthes'),

  // Supprimer un labyrinthe (par l'admin)
  adminDeleteLabyrinthe: (id) =>
    ipcRenderer.invoke('admin:deleteLabyrinthe', id),

  // Obtenir les statistiques globales
  adminGetStats: () =>
    ipcRenderer.invoke('admin:getStats'),
});
