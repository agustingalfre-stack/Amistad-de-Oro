// database.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'amistad.db');
const db = new sqlite3.Database(dbPath);

// Crear tablas si no existen
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS subsedes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    escudo TEXT,
    subsede_id INTEGER,
    FOREIGN KEY(subsede_id) REFERENCES subsedes(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS fixture (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subsede_id INTEGER,
    fecha TEXT,
    hora TEXT,
    local INTEGER,
    visitante INTEGER,
    FOREIGN KEY(subsede_id) REFERENCES subsedes(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS resultados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partido_id INTEGER,
    goles_local INTEGER,
    goles_visitante INTEGER,
    FOREIGN KEY(partido_id) REFERENCES fixture(id)
  )`);
});

module.exports = db;
