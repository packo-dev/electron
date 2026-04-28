// ============================================================
// ADMIN.JS — Fonctions d'administration
//
// Ce module fournit les fonctions reservees a l'administrateur :
// - Gestion des utilisateurs (creer, modifier, supprimer, lister)
// - Consultation de tous les labyrinthes
// - Statistiques globales
//
// La verification du role 'admin' se fait dans main.js (IPC handlers)
// avant d'appeler ces fonctions
// ============================================================

const db = require('./database');
const bcrypt = require('bcryptjs');

// ─── GESTION DES UTILISATEURS ──────────────────────────────

// Lister tous les utilisateurs (sans les mots de passe)
function getAllUsers() {
  return db.getAllUsers();
}

// Creer un utilisateur (l'admin peut choisir le role)
function createUser(username, email, password, role) {
  // On hashe le mot de passe avant de le stocker
  const hash = bcrypt.hashSync(password, 10);
  return db.createUser(username, email, hash);
}

// Modifier un utilisateur (nom, email, role)
function updateUser(id, username, email, role) {
  return db.updateUser(id, username, email, role);
}

// Supprimer un utilisateur et tous ses labyrinthes
function deleteUser(id) {
  return db.deleteUser(id);
}

// ─── GESTION DES LABYRINTHES ───────────────────────────────

// Voir tous les labyrinthes de tous les utilisateurs
function getAllLabyrinthes() {
  return db.getAllLabyrinthes();
}

// Supprimer un labyrinthe problematique ou inutilise
function deleteLabyrinthe(id) {
  return db.deleteLabyrinthe(id);
}

// ─── STATISTIQUES ──────────────────────────────────────────

// Retourne : nombre d'utilisateurs, nombre de labyrinthes, labyrinthes par user
function getStats() {
  return db.getStats();
}

module.exports = {
  getAllUsers, createUser, updateUser, deleteUser,
  getAllLabyrinthes, deleteLabyrinthe,
  getStats
};
