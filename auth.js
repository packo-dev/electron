// ============================================================
// AUTH.JS — Gestion de l'authentification
//
// Utilise bcryptjs pour hasher les mots de passe
// Utilise jsonwebtoken (JWT) pour generer des tokens de session
//
// Principe :
// 1. INSCRIPTION : on hashe le mot de passe avec bcrypt, on le stocke en base
// 2. CONNEXION : on compare le mot de passe saisi avec le hash en base
// 3. TOKEN JWT : on genere un token qui contient l'id, le nom et le role
//    Ce token est stocke cote client (localStorage) pour l'auto-login
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

// Cle secrete pour signer les tokens JWT (en production, utiliser une variable d'env)
const JWT_SECRET = 'labyrinthe-secret-key-2026';

// Nombre de tours de hashage bcrypt (10 = bon compromis securite/performance)
const SALT_ROUNDS = 10;

// ─── INSCRIPTION ───────────────────────────────────────────
// 1. Verifie que le nom d'utilisateur n'existe pas deja
// 2. Hashe le mot de passe avec bcrypt (jamais stocker en clair !)
// 3. Cree l'utilisateur en base
// 4. Genere un token JWT pour le connecter automatiquement
function register(username, email, password) {
  // Verifier si l'utilisateur existe deja
  const existing = db.getUserByUsername(username);
  if (existing) {
    throw new Error('Ce nom d\'utilisateur existe deja');
  }

  // Hasher le mot de passe : "monMotDePasse" -> "$2a$10$x7k2..."
  const hash = bcrypt.hashSync(password, SALT_ROUNDS);

  // Inserer en base de donnees
  const result = db.createUser(username, email, hash);

  // Generer un token JWT valide 7 jours
  const token = jwt.sign(
    { id: result.lastInsertRowid, username, role: 'user' }, // Donnees dans le token
    JWT_SECRET,                                               // Cle secrete
    { expiresIn: '7d' }                                       // Duree de validite
  );

  // Retourner le token + les infos utilisateur (sans le mot de passe !)
  return {
    token,
    user: { id: result.lastInsertRowid, username, email, role: 'user' }
  };
}

// ─── CONNEXION ─────────────────────────────────────────────
// 1. Cherche l'utilisateur par son nom
// 2. Compare le mot de passe saisi avec le hash en base
// 3. Si OK, genere un token JWT
function login(username, password) {
  // Chercher l'utilisateur en base
  const user = db.getUserByUsername(username);
  if (!user) {
    throw new Error('Utilisateur introuvable');
  }

  // Comparer le mot de passe : bcrypt.compareSync("monMotDePasse", "$2a$10$x7k2...")
  // Retourne true si ca correspond, false sinon
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    throw new Error('Mot de passe incorrect');
  }

  // Generer le token JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    user: { id: user.id, username: user.username, email: user.email, role: user.role }
  };
}

// ─── VERIFICATION DU TOKEN ─────────────────────────────────
// Quand l'app demarre, on verifie si le token stocke dans localStorage est encore valide
// jwt.verify() decode le token et verifie sa signature et sa date d'expiration
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET); // Retourne les donnees du token si valide
  } catch {
    return null; // Token invalide ou expire
  }
}

module.exports = { register, login, verifyToken };
