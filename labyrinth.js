// ============================================================
// LABYRINTH.JS — Generation et resolution de labyrinthes
//
// GENERATION : Algorithme "Recursive Backtracking" (DFS)
//   - On part d'une grille ou toutes les cellules ont 4 murs
//   - On visite les cellules une par une en cassant les murs
//   - Ca cree un labyrinthe "parfait" (un seul chemin entre 2 points)
//
// RESOLUTION : Algorithme BFS (Breadth-First Search)
//   - On explore le labyrinthe couche par couche depuis le depart
//   - Le premier chemin trouve est garanti d'etre le plus court
// ============================================================

// ─── GENERATION DU LABYRINTHE ──────────────────────────────
// width = nombre de colonnes, height = nombre de lignes
// difficulty = 1 (facile, beaucoup de chemins) a 10 (difficile, peu de chemins)
function generateMaze(width, height, difficulty) {
  const cols = width;
  const rows = height;

  // ETAPE 1 : Creer la grille
  // Chaque cellule a 4 murs : top, right, bottom, left
  // true = le mur existe, false = le mur est casse (on peut passer)
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { top: true, right: true, bottom: true, left: true, visited: false };
    }
  }

  // ETAPE 2 : Algorithme DFS (Depth-First Search) avec backtracking
  // Principe : on avance dans une direction aleatoire tant qu'on peut,
  // quand on est bloque on revient en arriere (backtrack)
  const stack = [];                      // Pile pour le backtracking
  grid[0][0].visited = true;             // On commence en haut a gauche
  stack.push([0, 0]);                    // On empile la position de depart

  while (stack.length > 0) {
    // On regarde la cellule en haut de la pile (position actuelle)
    const [cr, cc] = stack[stack.length - 1];

    // On cherche les voisins non visites
    const neighbors = getUnvisitedNeighbors(cr, cc, grid, rows, cols);

    if (neighbors.length === 0) {
      // Aucun voisin non visite : on revient en arriere (backtrack)
      stack.pop();
    } else {
      // On choisit un voisin aleatoire
      const [nr, nc, dir] = neighbors[Math.floor(Math.random() * neighbors.length)];

      // On casse le mur entre la cellule actuelle et le voisin choisi
      removeWall(grid, cr, cc, nr, nc, dir);

      // On marque le voisin comme visite et on l'empile
      grid[nr][nc].visited = true;
      stack.push([nr, nc]);
    }
  }

  // ETAPE 3 : Ajuster la difficulte
  // Plus la difficulte est basse, plus on casse des murs supplementaires
  // Cela cree des chemins alternatifs et rend le labyrinthe plus facile
  const maxExtraRemovals = Math.floor((cols * rows) * (10 - difficulty) / 20);
  let removed = 0;
  for (let i = 0; i < maxExtraRemovals * 3 && removed < maxExtraRemovals; i++) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const dirs = ['top', 'right', 'bottom', 'left'];
    const dir = dirs[Math.floor(Math.random() * 4)];

    const [nr, nc] = getNeighborCoords(r, c, dir);
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[r][c][dir]) {
      removeWall(grid, r, c, nr, nc, dir);
      removed++;
    }
  }

  // ETAPE 4 : Nettoyer les flags "visited" (plus besoin)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      delete grid[r][c].visited;
    }
  }

  // Retourner le labyrinthe complet
  return {
    grid,                                // La grille avec les murs
    rows,                                // Nombre de lignes
    cols,                                // Nombre de colonnes
    start: { row: 0, col: 0 },          // Depart = coin haut-gauche
    end: { row: rows - 1, col: cols - 1 } // Arrivee = coin bas-droite
  };
}

// ─── FONCTIONS UTILITAIRES POUR LA GENERATION ──────────────

// Retourner la liste des voisins non visites d'une cellule
function getUnvisitedNeighbors(r, c, grid, rows, cols) {
  const neighbors = [];
  if (r > 0 && !grid[r - 1][c].visited)       neighbors.push([r - 1, c, 'top']);
  if (c < cols - 1 && !grid[r][c + 1].visited) neighbors.push([r, c + 1, 'right']);
  if (r < rows - 1 && !grid[r + 1][c].visited) neighbors.push([r + 1, c, 'bottom']);
  if (c > 0 && !grid[r][c - 1].visited)       neighbors.push([r, c - 1, 'left']);
  return neighbors;
}

// Retourner les coordonnees du voisin dans une direction donnee
function getNeighborCoords(r, c, dir) {
  switch (dir) {
    case 'top':    return [r - 1, c];
    case 'right':  return [r, c + 1];
    case 'bottom': return [r + 1, c];
    case 'left':   return [r, c - 1];
    default:       return [-1, -1];
  }
}

// Casser le mur entre deux cellules adjacentes
// Quand on casse un mur, il faut le casser des DEUX cotes
// Exemple : casser le mur "right" de (0,0) = casser le mur "left" de (0,1)
function removeWall(grid, r1, c1, r2, c2, dir) {
  switch (dir) {
    case 'top':
      grid[r1][c1].top = false;
      grid[r2][c2].bottom = false;
      break;
    case 'right':
      grid[r1][c1].right = false;
      grid[r2][c2].left = false;
      break;
    case 'bottom':
      grid[r1][c1].bottom = false;
      grid[r2][c2].top = false;
      break;
    case 'left':
      grid[r1][c1].left = false;
      grid[r2][c2].right = false;
      break;
  }
}

// ─── RESOLUTION DU LABYRINTHE ──────────────────────────────
// Algorithme BFS (Breadth-First Search / Parcours en largeur)
//
// Principe : on explore toutes les cellules a distance 1 du depart,
// puis toutes celles a distance 2, etc.
// Le premier chemin qui atteint l'arrivee est le plus court.
//
// On utilise un tableau "parent" pour reconstruire le chemin a la fin
function solveMaze(mazeData) {
  const { grid, rows, cols, start, end } = mazeData;

  // File d'attente pour le BFS (FIFO : First In, First Out)
  const queue = [[start.row, start.col]];

  // Tableau pour savoir quelles cellules ont deja ete visitees
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  // Tableau pour memoriser d'ou on vient (pour reconstruire le chemin)
  const parent = Array.from({ length: rows }, () => Array(cols).fill(null));

  visited[start.row][start.col] = true;

  while (queue.length > 0) {
    // On prend la premiere cellule de la file
    const [cr, cc] = queue.shift();

    // Si on est arrive a la fin, on reconstruit le chemin
    if (cr === end.row && cc === end.col) {
      const path = [];
      let current = [end.row, end.col];
      // On remonte de parent en parent jusqu'au depart
      while (current) {
        path.unshift({ row: current[0], col: current[1] });
        current = parent[current[0]][current[1]];
      }
      return path; // Le chemin du depart a l'arrivee
    }

    // On regarde les 4 directions possibles
    const cell = grid[cr][cc];

    // Haut : si pas de mur en haut ET pas deja visite
    if (!cell.top && cr > 0 && !visited[cr - 1][cc]) {
      visited[cr - 1][cc] = true;
      parent[cr - 1][cc] = [cr, cc];
      queue.push([cr - 1, cc]);
    }
    // Droite
    if (!cell.right && cc < cols - 1 && !visited[cr][cc + 1]) {
      visited[cr][cc + 1] = true;
      parent[cr][cc + 1] = [cr, cc];
      queue.push([cr, cc + 1]);
    }
    // Bas
    if (!cell.bottom && cr < rows - 1 && !visited[cr + 1][cc]) {
      visited[cr + 1][cc] = true;
      parent[cr + 1][cc] = [cr, cc];
      queue.push([cr + 1, cc]);
    }
    // Gauche
    if (!cell.left && cc > 0 && !visited[cr][cc - 1]) {
      visited[cr][cc - 1] = true;
      parent[cr][cc - 1] = [cr, cc];
      queue.push([cr, cc - 1]);
    }
  }

  // Si on arrive ici, il n'y a pas de chemin (ne devrait pas arriver)
  return [];
}

module.exports = { generateMaze, solveMaze };
