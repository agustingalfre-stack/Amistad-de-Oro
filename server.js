// =======================
// SERVIDOR TORNEO FUTBOL CON SQLITE
// =======================

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 4000;

// =======================
// MIDDLEWARES
// =======================
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(__dirname));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// =======================
// BASE DE DATOS
// =======================
const db = new Database("torneo.db");

// Funciones async para better-sqlite3
const allAsync = (stmt, params = []) => Promise.resolve(stmt.all(...params));
const getAsync  = (stmt, params = []) => Promise.resolve(stmt.get(...params));
const runAsync  = (stmt, params = []) => Promise.resolve(stmt.run(...params));

// =======================
// CREAR TABLAS
// =======================
db.prepare(`
  CREATE TABLE IF NOT EXISTS subsedes (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS equipos (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    subsedeId INTEGER NOT NULL,
    escudo TEXT,
    grupo TEXT,
    FOREIGN KEY(subsedeId) REFERENCES subsedes(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS jugadores (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    fechaNacimiento TEXT NOT NULL,
    documento TEXT NOT NULL,
    numeroCamiseta INTEGER NOT NULL,
    equipoId INTEGER NOT NULL,
    FOREIGN KEY(equipoId) REFERENCES equipos(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS partidos (
    id INTEGER PRIMARY KEY,
    subsedeId INTEGER NOT NULL,
    local INTEGER NOT NULL,
    visitante INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora TEXT,
    canchaId INTEGER,
    golesLocal INTEGER,
    golesVisitante INTEGER,
    observaciones TEXT,
    grupo TEXT,
    FOREIGN KEY(subsedeId) REFERENCES subsedes(id) ON DELETE CASCADE,
    FOREIGN KEY(local) REFERENCES equipos(id) ON DELETE CASCADE,
    FOREIGN KEY(visitante) REFERENCES equipos(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS canchas (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    subsedeId INTEGER,
    FOREIGN KEY(subsedeId) REFERENCES subsedes(id) ON DELETE CASCADE
  )
`).run();

// =======================
// RUTAS SUBSEDES
// =======================
app.get("/subsede", async (req, res) => {
  const subsedes = await allAsync(db.prepare("SELECT * FROM subsedes"));
  res.json(subsedes);
});

app.get("/subsede/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const subsede = await getAsync(db.prepare("SELECT * FROM subsedes WHERE id=?"), [id]);
  if (!subsede) return res.status(404).json({ error: "Subsede no encontrada" });
  res.json(subsede);
});

app.post("/subsede", async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

  const info = await runAsync(db.prepare("INSERT INTO subsedes (nombre) VALUES (?)"), [nombre]);
  res.json({ id: info.lastInsertRowid, nombre });
});

app.put("/subsede/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { nombre } = req.body;
  const subsede = await getAsync(db.prepare("SELECT * FROM subsedes WHERE id=?"), [id]);
  if (!subsede) return res.status(404).json({ error: "Subsede no encontrada" });

  await runAsync(db.prepare("UPDATE subsedes SET nombre=? WHERE id=?"), [nombre || subsede.nombre, id]);
  const actualizado = await getAsync(db.prepare("SELECT * FROM subsedes WHERE id=?"), [id]);
  res.json(actualizado);
});

app.delete("/subsede/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await runAsync(db.prepare("DELETE FROM subsedes WHERE id=?"), [id]);
  res.json({ ok: true });
});

// =======================
// RUTAS EQUIPOS
// =======================
app.get("/equipos/:subsedeId", async (req, res) => {
  const subsedeId = parseInt(req.params.subsedeId);
  const equipos = await allAsync(db.prepare("SELECT * FROM equipos WHERE subsedeId=?"), [subsedeId]);
  res.json(equipos);
});

app.get("/equipos/:id/equipo", async (req, res) => {
  const id = parseInt(req.params.id);
  const equipo = await getAsync(db.prepare("SELECT * FROM equipos WHERE id=?"), [id]);
  if (!equipo) return res.status(404).json({ error: "Equipo no encontrado" });
  res.json(equipo);
});

app.post("/equipos", upload.single("escudo"), async (req, res) => {
  const { nombre, subsedeId, grupo } = req.body;
  if (!nombre || !subsedeId) return res.status(400).json({ error: "Datos faltantes" });
  const escudo = req.file ? `/uploads/${req.file.filename}` : null;

  const info = await runAsync(db.prepare("INSERT INTO equipos (nombre, subsedeId, escudo, grupo) VALUES (?, ?, ?, ?)"),
    [nombre, subsedeId, escudo, grupo || null]);

  res.json({ id: info.lastInsertRowid, nombre, subsedeId: parseInt(subsedeId), escudo, grupo });
});

app.put("/equipos/:id", upload.single("escudo"), async (req, res) => {
  const id = parseInt(req.params.id);
  const equipo = await getAsync(db.prepare("SELECT * FROM equipos WHERE id=?"), [id]);
  if (!equipo) return res.status(404).json({ error: "Equipo no encontrado" });

  const { nombre, grupo } = req.body;
  const escudo = req.file ? `/uploads/${req.file.filename}` : equipo.escudo;

  await runAsync(db.prepare("UPDATE equipos SET nombre=?, escudo=?, grupo=? WHERE id=?"), [
    nombre || equipo.nombre,
    escudo,
    grupo || equipo.grupo,
    id
  ]);

  const actualizado = await getAsync(db.prepare("SELECT * FROM equipos WHERE id=?"), [id]);
  res.json(actualizado);
});

app.delete("/equipos/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await runAsync(db.prepare("DELETE FROM equipos WHERE id=?"), [id]);
  res.json({ ok: true });
});

// =======================
// RUTAS CANCHAS
// =======================

// Obtener todas las canchas
app.get("/canchas", async (req, res) => {
  const canchas = await allAsync(db.prepare("SELECT * FROM canchas"));
  res.json(canchas);
});

// Obtener canchas de una subsede
app.get("/canchas/:subsedeId", async (req, res) => {
  const subsedeId = parseInt(req.params.subsedeId);
  const canchas = await allAsync(db.prepare("SELECT * FROM canchas WHERE subsedeId=?"), [subsedeId]);
  res.json(canchas);
});

// Crear cancha
app.post("/canchas", async (req, res) => {
  const { nombre, subsedeId } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

  const info = await runAsync(db.prepare("INSERT INTO canchas (nombre, subsedeId) VALUES (?, ?)"), [nombre, subsedeId || null]);
  res.json({ id: info.lastInsertRowid, nombre, subsedeId: subsedeId || null });
});

// Editar cancha
app.put("/canchas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const cancha = await getAsync(db.prepare("SELECT * FROM canchas WHERE id=?"), [id]);
  if (!cancha) return res.status(404).json({ error: "Cancha no encontrada" });

  const { nombre, subsedeId } = req.body;
  await runAsync(db.prepare("UPDATE canchas SET nombre=?, subsedeId=? WHERE id=?"), [
    nombre || cancha.nombre,
    subsedeId || cancha.subsedeId,
    id
  ]);

  const actualizado = await getAsync(db.prepare("SELECT * FROM canchas WHERE id=?"), [id]);
  res.json(actualizado);
});

// Eliminar cancha
app.delete("/canchas/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await runAsync(db.prepare("DELETE FROM canchas WHERE id=?"), [id]);
  res.json({ ok: true });
});

// =======================
// RUTAS JUGADORES
// =======================
app.get("/jugadores/:equipoId", async (req, res) => {
  const equipoId = parseInt(req.params.equipoId);
  const jugadores = await allAsync(db.prepare("SELECT * FROM jugadores WHERE equipoId=?"), [equipoId]);
  res.json(jugadores);
});

app.post("/jugadores", async (req, res) => {
  const { nombre, apellido, fechaNacimiento, documento, numeroCamiseta, equipoId } = req.body;
  if (!nombre || !apellido || !fechaNacimiento || !documento || !numeroCamiseta || !equipoId) {
    return res.status(400).json({ error: "Datos faltantes" });
  }

  const info = await runAsync(db.prepare(`
    INSERT INTO jugadores (nombre, apellido, fechaNacimiento, documento, numeroCamiseta, equipoId)
    VALUES (?, ?, ?, ?, ?, ?)
  `), [nombre, apellido, fechaNacimiento, documento, numeroCamiseta, equipoId]);

  res.json({ id: info.lastInsertRowid, nombre, apellido, fechaNacimiento, documento, numeroCamiseta, equipoId });
});

app.put("/jugadores/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const jugador = await getAsync(db.prepare("SELECT * FROM jugadores WHERE id=?"), [id]);
  if (!jugador) return res.status(404).json({ error: "Jugador no encontrado" });

  const { nombre, apellido, fechaNacimiento, documento, numeroCamiseta } = req.body;

  await runAsync(db.prepare(`
    UPDATE jugadores
    SET nombre=?, apellido=?, fechaNacimiento=?, documento=?, numeroCamiseta=?
    WHERE id=?
  `), [
    nombre || jugador.nombre,
    apellido || jugador.apellido,
    fechaNacimiento || jugador.fechaNacimiento,
    documento || jugador.documento,
    numeroCamiseta || jugador.numeroCamiseta,
    id
  ]);

  const actualizado = await getAsync(db.prepare("SELECT * FROM jugadores WHERE id=?"), [id]);
  res.json(actualizado);
});

app.delete("/jugadores/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await runAsync(db.prepare("DELETE FROM jugadores WHERE id=?"), [id]);
  res.json({ ok: true });
});

// =======================
// RUTAS FIXTURE (PARTIDOS)
// =======================
app.get("/fixture/:subsedeId", async (req, res) => {
  const subsedeId = parseInt(req.params.subsedeId);
  const partidos = await allAsync(db.prepare(`
    SELECT 
      p.id, p.subsedeId, p.local, p.visitante, 
      p.fecha, p.hora, p.canchaId,
      p.golesLocal, p.golesVisitante,
      p.observaciones,
      p.grupo,                     -- ← AQUI IMPORTANTE
      el.nombre AS localNombre,
      ev.nombre AS visitanteNombre,
      c.nombre AS cancha
    FROM partidos p
    LEFT JOIN equipos el ON el.id = p.local
    LEFT JOIN equipos ev ON ev.id = p.visitante
    LEFT JOIN canchas c ON c.id = p.canchaId
    WHERE p.subsedeId = ?
    ORDER BY p.fecha ASC, p.hora ASC
  `), [subsedeId]);
  res.json(partidos);
});

app.get("/fixture/partido/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const partido = await getAsync(db.prepare("SELECT * FROM partidos WHERE id=?"), [id]);
  if (!partido) return res.status(404).json({ error: "Partido no encontrado" });

  const localNombre = (await getAsync(db.prepare("SELECT nombre FROM equipos WHERE id=?"), [partido.local]))?.nombre || "Desconocido";
  const visitanteNombre = (await getAsync(db.prepare("SELECT nombre FROM equipos WHERE id=?"), [partido.visitante]))?.nombre || "Desconocido";

  res.json({ ...partido, equipoLocalNombre: localNombre, equipoVisitanteNombre: visitanteNombre });
});

app.post("/fixture", async (req, res) => {
  const { subsedeId, local, visitante, fecha, hora, canchaId, grupo } = req.body;
  if (!subsedeId || !local || !visitante || !fecha || !canchaId) {return res.status(400).send("Datos incompletos");
  }
  const info = await runAsync(db.prepare(`
    INSERT INTO partidos (subsedeId, local, visitante, fecha, hora, canchaId, grupo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `), [subsedeId, local, visitante, fecha, hora || "", canchaId, grupo]);

  res.json({ id: info.lastInsertRowid, subsedeId, local, visitante, fecha, hora: hora || "", canchaId, grupo });
});

app.put("/fixture/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const partido = await getAsync(db.prepare("SELECT * FROM partidos WHERE id=?"), [id]);
  if (!partido) return res.status(404).json({ error: "Partido no encontrado" });

  const { local, visitante, fecha, hora, canchaId } = req.body;

  await runAsync(db.prepare(`
    UPDATE partidos
    SET local=?, visitante=?, fecha=?, hora=?, canchaId=?
    WHERE id=?
  `), [
    local || partido.local,
    visitante || partido.visitante,
    fecha || partido.fecha,
    hora !== undefined ? hora : partido.hora,
    canchaId || partido.canchaId,
    id
  ]);

  const actualizado = await getAsync(db.prepare("SELECT * FROM partidos WHERE id=?"), [id]);
  res.json(actualizado);
});

app.delete("/fixture/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await runAsync(db.prepare("DELETE FROM partidos WHERE id=?"), [id]);
  res.json({ ok: true });
});

// =======================
// RUTAS RESULTADOS
// =======================
app.get("/resultados/:subsedeId", async (req, res) => {
  const subsedeId = parseInt(req.params.subsedeId);
  const resultados = await allAsync(db.prepare(`
    SELECT * FROM partidos WHERE subsedeId=? AND golesLocal IS NOT NULL AND golesVisitante IS NOT NULL
  `), [subsedeId]);
  res.json(resultados);
});

app.post("/resultados", async (req, res) => {
  const { subsedeId, partido, golesLocal, golesVisitante, observaciones } = req.body;
  const match = await getAsync(db.prepare("SELECT * FROM partidos WHERE id=? AND subsedeId=?"), [partido, subsedeId]);
  if (!match) return res.status(404).send("Partido no encontrado");

  await runAsync(db.prepare(`
    UPDATE partidos SET golesLocal=?, golesVisitante=?, observaciones=? WHERE id=?
  `), [golesLocal, golesVisitante, observaciones || "", partido]);

  const actualizado = await getAsync(db.prepare("SELECT * FROM partidos WHERE id=?"), [partido]);
  res.json(actualizado);
});

// Eliminar resultado de un partido
app.delete("/resultados/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  // Validamos que el id sea un número
  if (isNaN(id)) return res.status(400).json({ error: "ID inválido" });

  try {
    // Limpiamos los goles y observaciones
    await runAsync(
      db.prepare(`
        UPDATE partidos SET golesLocal=NULL, golesVisitante=NULL, observaciones='' WHERE id=?
      `),
      [id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =======================
// RUTAS POSICIONES
// =======================

app.get("/posiciones/:subsedeId", async (req, res) => {
  const subsedeId = parseInt(req.params.subsedeId);

  const partidos = await allAsync(db.prepare(`
    SELECT 
      p.local, p.visitante, p.golesLocal, p.golesVisitante,
      el.nombre AS localNombre,  el.grupo AS grupoLocal,
      ev.nombre AS visitanteNombre, ev.grupo AS grupoVisitante
    FROM partidos p
    LEFT JOIN equipos el ON el.id = p.local
    LEFT JOIN equipos ev ON ev.id = p.visitante
    WHERE p.subsedeId = ?
  `), [subsedeId]);

  let posiciones = {};

  partidos.forEach(p => {
    let grupo = p.grupoLocal; // ambos equipos deberían tener el mismo grupo

    if (!posiciones[grupo]) posiciones[grupo] = {};

    // Inicializar si no existen
    [p.local, p.visitante].forEach(e => {
      const nombre = e === p.local ? p.localNombre : p.visitanteNombre;
      if (!posiciones[grupo][e]) posiciones[grupo][e] = {
        id: e, nombre,
        pts:0,pj:0,pg:0,pe:0,pp:0,gf:0,gc:0,dif:0
      };
    });

    if (p.golesLocal == null || p.golesVisitante == null) return;

    let L = posiciones[grupo][p.local];
    let V = posiciones[grupo][p.visitante];

    L.pj++; V.pj++;
    L.gf += p.golesLocal; L.gc += p.golesVisitante;
    V.gf += p.golesVisitante; V.gc += p.golesLocal;
    L.dif = L.gf - L.gc;
    V.dif = V.gf - V.gc;

    if (p.golesLocal > p.golesVisitante) { L.pg++; V.pp++; L.pts += 3; }
    else if (p.golesLocal < p.golesVisitante) { V.pg++; L.pp++; V.pts += 3; }
    else { L.pe++; V.pe++; L.pts++; V.pts++; }
  });

  res.json(posiciones);
});

// =======================
// INICIAR SERVIDOR
// =======================
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
