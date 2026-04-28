// ============================================================
// DATABASE.JS — Connexion a SQLite et operations CRUD
//
// On utilise sql.js (SQLite compile en JavaScript pur).
// La base est stockee dans un fichier "labyrinthe.db"
// dans le dossier utilisateur de l'application.
//
// Ce fichier contient toutes les requetes SQL du projet.
// ============================================================

const initSqlJs = require('sql.js');  // Librairie SQLite en JavaScript
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Variables globales du module
let db;      // L'instance de la base de donnees
let dbPath;  // Le chemin du fichier .db sur le disque

// ─── CHEMIN DU FICHIER DE BASE DE DONNEES ──────────────────
// app.getPath('userData') retourne le dossier de l'application
// Exemple Windows : C:\Users\PC\AppData\Roaming\projet-labyrinthe-electron
function getDbPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'labyrinthe.db');
}

// ─── SAUVEGARDER LA BASE SUR LE DISQUE ─────────────────────
// sql.js travaille en memoire, donc apres chaque modification
// on exporte les donnees et on les ecrit dans le fichier
function saveDb() {
  const data = db.export();              // Exporte la DB en binaire
  const buffer = Buffer.from(data);      // Convertit en Buffer Node.js
  fs.writeFileSync(dbPath, buffer);      // Ecrit sur le disque
}

// ─── INITIALISATION DE LA BASE ─────────────────────────────
// Fonction async car sql.js a besoin de charger son fichier WASM
async function initDatabase() {
  const SQL = await initSqlJs();
  dbPath = getDbPath();

  // Si le fichier existe deja, on le charge. Sinon, on cree une nouvelle base
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Active les cles etrangeres (pour la suppression en cascade)
  db.run('PRAGMA foreign_keys = ON;');

  // ─── TABLE USERS ───────────────────────────────────────
  // Stocke les utilisateurs avec mot de passe hashe
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ─── TABLE LABYRINTHES ─────────────────────────────────
  // Stocke les labyrinthes au format JSON (colonne maze_data)
  // Chaque labyrinthe est lie a un utilisateur (user_id)
  db.run(`
    CREATE TABLE IF NOT EXISTS labyrinthes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      difficulty INTEGER NOT NULL,
      maze_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ─── COMPTE ADMIN PAR DEFAUT ───────────────────────────
  // Si aucun admin n'existe, on en cree un (admin / admin123)
  const adminCheck = db.exec("SELECT * FROM users WHERE role = 'admin'");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.run(
      'INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      ['admin', 'admin@labyrinthe.com', hash, 'admin']
    );
  }

  saveDb();
  return db;
}

// ============================================================
//  FONCTIONS UTILITAIRES POUR LES REQUETES
// ============================================================

// Executer un SELECT et retourner un tableau d'objets
// Exemple : queryAll("SELECT * FROM users") => [{ id: 1, username: "admin", ... }, ...]
function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject()); // Chaque ligne devient un objet JS
  }
  stmt.free();
  return results;
}

// Executer un SELECT et retourner UN SEUL objet (ou null)
function queryOne(sql, params) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

// Executer un INSERT/UPDATE/DELETE et sauvegarder
// Retourne l'ID de la derniere ligne inseree
function runSql(sql, params) {
  db.run(sql, params);
  saveDb();
  const lastId = db.exec("SELECT last_insert_rowid() as id");
  return { lastInsertRowid: lastId[0]?.values[0]?.[0] || 0 };
}

// ============================================================
//  CRUD UTILISATEURS
// ============================================================

// Creer un utilisateur (le mot de passe est deja hashe par auth.js)
function createUser(username, email, password) {
  return runSql('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, password]);
}

// Trouver un utilisateur par son nom (pour la connexion)
function getUserByUsername(username) {
  return queryOne('SELECT * FROM users WHERE username = ?', [username]);
}

// Trouver un utilisateur par son ID
function getUserById(id) {
  return queryOne('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [id]);
}

// Lister tous les utilisateurs (pour l'admin)
function getAllUsers() {
  return queryAll('SELECT id, username, email, role, created_at FROM users');
}

// Modifier un utilisateur (nom, email, role)
function updateUser(id, username, email, role) {
  db.run('UPDATE users SET username = ?, email = ?, role = ? WHERE id = ?', [username, email, role, id]);
  saveDb();
}

// Supprimer un utilisateur et tous ses labyrinthes
function deleteUser(id) {
  db.run('DELETE FROM labyrinthes WHERE user_id = ?', [id]);
  db.run('DELETE FROM users WHERE id = ?', [id]);
  saveDb();
}

// ============================================================
//  CRUD LABYRINTHES
// ============================================================

// Creer un labyrinthe (les donnees du labyrinthe sont stockees en JSON)
function createLabyrinthe(userId, name, width, height, difficulty, mazeData) {
  return runSql(
    'INSERT INTO labyrinthes (user_id, name, width, height, difficulty, maze_data) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, name, width, height, difficulty, JSON.stringify(mazeData)]
  );
}

// Lire les labyrinthes d'un utilisateur (tries du plus recent au plus ancien)
function getLabyrinthesByUser(userId) {
  return queryAll('SELECT * FROM labyrinthes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

// Lire un labyrinthe par son ID
function getLabyrintheById(id) {
  return queryOne('SELECT * FROM labyrinthes WHERE id = ?', [id]);
}

// Lire TOUS les labyrinthes avec le nom de l'utilisateur (pour l'admin)
function getAllLabyrinthes() {
  return queryAll(`
    SELECT l.*, u.username
    FROM labyrinthes l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
  `);
}

// Modifier un labyrinthe (nom + donnees)
function updateLabyrinthe(id, name, mazeData) {
  db.run(
    'UPDATE labyrinthes SET name = ?, maze_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, JSON.stringify(mazeData), id]
  );
  saveDb();
}

// Supprimer un labyrinthe
function deleteLabyrinthe(id) {
  db.run('DELETE FROM labyrinthes WHERE id = ?', [id]);
  saveDb();
}

// ============================================================
//  STATISTIQUES (pour l'interface admin)
// ============================================================
function getStats() {
  // Nombre total d'utilisateurs
  const totalUsersRes = db.exec('SELECT COUNT(*) as count FROM users');
  const totalUsers = totalUsersRes[0]?.values[0]?.[0] || 0;

  // Nombre total de labyrinthes
  const totalLabyrinthesRes = db.exec('SELECT COUNT(*) as count FROM labyrinthes');
  const totalLabyrinthes = totalLabyrinthesRes[0]?.values[0]?.[0] || 0;

  // Nombre de labyrinthes par utilisateur (avec LEFT JOIN pour inclure les users sans labyrinthes)
  const labyrinthesParUser = queryAll(`
    SELECT u.username, COUNT(l.id) as count
    FROM users u
    LEFT JOIN labyrinthes l ON u.id = l.user_id
    GROUP BY u.id
  `);

  return { totalUsers, totalLabyrinthes, labyrinthesParUser };
}

// ─── EXPORT DES FONCTIONS ──────────────────────────────────
// On exporte toutes les fonctions pour les utiliser dans main.js et admin.js
module.exports = {
  initDatabase,
  createUser, getUserByUsername, getUserById, getAllUsers, updateUser, deleteUser,
  createLabyrinthe, getLabyrinthesByUser, getLabyrintheById, getAllLabyrinthes, updateLabyrinthe, deleteLabyrinthe,
  getStats
};
