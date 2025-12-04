const express = require('express');
const router = express.Router();
const fs = require('fs');

const dbFile = './data/db.json';

// Cargar equipos
router.post('/add', (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).send({ error: 'Falta el nombre del equipo' });

    const db = JSON.parse(fs.readFileSync(dbFile));
    const nuevoEquipo = { id: db.equipos.length + 1, nombre, puntos: 0, gf: 0, gc: 0 };
    db.equipos.push(nuevoEquipo);
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

    res.send(nuevoEquipo);
});

// Listar equipos
router.get('/', (req, res) => {
    const db = JSON.parse(fs.readFileSync(dbFile));
    res.send(db.equipos);
});

module.exports = router;
