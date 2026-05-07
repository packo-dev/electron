# Labyrinthe Electron

Application desktop multiplateforme (Electron) de **création** et **résolution** de labyrinthes.

## Fonctionnalités

| Module | Description |
|--------|-------------|
| Authentification | Inscription, connexion, JWT + bcrypt, auto-login |
| CRUD labyrinthes | Création, lecture, modification, suppression (SQLite, JSON) |
| Génération | Tailles petite / moyenne / grande, difficulté 1 à 10 (DFS) |
| Résolution | Chemin automatique affiché (BFS) |
| Administration | Gestion utilisateurs, tous les labyrinthes, statistiques |
| Interface | Thème rétro pixel art (login, dashboard, jeu, admin) |

## Technologies

- **Electron** (JavaScript, HTML, CSS)
- **SQLite** via [sql.js](https://github.com/sql-js/sql.js)
- **bcryptjs** — hash des mots de passe
- **jsonwebtoken** — sessions sécurisées

## Installation

```bash
cd projet_labyrinthe_electron
npm install
npm start
```

## Build (exécutable Windows)

```bash
npm run build
```

Le fichier portable `.exe` est généré dans le dossier `dist/`.

## Structure du projet

```
projet_labyrinthe_electron/
├── main.js           # Processus principal Electron
├── preload.js        # Pont IPC (contextBridge)
├── database.js       # SQLite + CRUD
├── auth.js           # Authentification
├── labyrinth.js      # Génération DFS + résolution BFS
├── admin.js          # Logique administrateur
├── package.json
└── renderer/
    ├── index.html
    ├── style.css
    └── app.js        # Interface utilisateur
```

## Utilisation

1. **Inscription** puis connexion (ou reconnexion automatique via token).
2. **Dashboard** : liste de vos labyrinthes, création, édition, suppression.
3. **Créer / jouer** : choisir taille et difficulté, générer, résoudre, sauvegarder.
4. **Admin** (rôle `admin`) : utilisateurs, labyrinthes globaux, statistiques.

## Équipe

| Pseudo | Rôle |
|--------|------|
| FloKBCode | Electron, IPC, labyrinthes |
| Marly1322007 | UI, sons, export |
| Saraht25 | Base de données, CRUD |

## Release

Téléchargement de l'exécutable : [Releases GitHub](https://github.com/packo-dev/electron/releases/latest)

## Captures d'écran

| Écran | Description |
|-------|-------------|
| Login | Authentification / inscription |
| Dashboard | Liste des labyrinthes |
| Jeu | Génération et résolution |
| Admin | Panel administrateur |

## Licence

ISC
