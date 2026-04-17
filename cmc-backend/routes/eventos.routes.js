// cmc-backend/routes/eventos.routes.js
// Gestión de Eventos/Ediciones CMC — Fase 2
//
// TABLA: eventos (id, nombre, sede, edicion, fecha_inicio, fecha_fin,
//                 estado, visible_roles, descripcion, imagen_url, es_activo)
//
// ENDPOINTS:
//   GET    /api/eventos              → lista todos (admin/staff)
//   GET    /api/eventos/activo       → evento activo actual (público)
//   POST   /api/eventos              → crear (super_admin)
//   PUT    /api/eventos/:id          → editar (super_admin)
//   DELETE /api/eventos/:id          → eliminar (super_admin)
//   PATCH  /api/eventos/:id/estado   → cambiar estado (super_admin)
//   PATCH  /api/eventos/:id/activar  → marcar como evento activo global (super_admin)

import express from 'express';
import pool    from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';

const router = express.Router();

const ESTADOS_VALIDOS = ['borrador','activo','suspendido','concluido','cancelado'];

// ── GET /api/eventos ─────────────────────────────────────
router.get('/', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user?.rol))
      return res.status(403).json({ error: 'Sin permisos' });

    const { sede, edicion, estado } = req.query;
    const params = [];
    const where  = [];

    if (sede)   { where.push(`LOWER(sede) = LOWER($${params.length+1})`);   params.push(sede); }
    if (edicion){ where.push(`edicion = $${params.length+1}`);               params.push(parseInt(edicion)); }
    if (estado) { where.push(`estado = $${params.length+1}`);                params.push(estado); }

    const sql = `
      SELECT e.*,
             u.nombre as creado_por_nombre
      FROM eventos e
      LEFT JOIN users u ON u.id = e.created_by
      ${where.length ? 'WHERE '+where.join(' AND ') : ''}
      ORDER BY e.es_activo DESC, e.edicion DESC, e.sede ASC, e.created_at DESC
    `;
    const r = await pool.query(sql, params);
    res.json({ ok: true, eventos: r.rows });
  } catch (err) {
    console.error('[Eventos] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/eventos/activo ────────────────────────────── (público)
router.get('/activo', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM eventos WHERE es_activo = true LIMIT 1`
    );
    res.json({ ok: true, evento: r.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/eventos ──────────────────────────────────── (super_admin)
router.post('/', authRequired, async (req, res) => {
  try {
    if (req.user?.rol !== 'super_admin')
      return res.status(403).json({ error: 'Solo super_admin puede crear eventos' });

    const {
      nombre, sede, edicion, fecha_inicio, fecha_fin,
      estado = 'borrador', visible_roles = ['todos'],
      descripcion, imagen_url,
    } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'nombre es requerido' });
    if (!sede?.trim())   return res.status(400).json({ error: 'sede es requerida' });
    if (!edicion)        return res.status(400).json({ error: 'edicion es requerida' });
    if (!ESTADOS_VALIDOS.includes(estado))
      return res.status(400).json({ error: `estado inválido: ${ESTADOS_VALIDOS.join(', ')}` });

    const r = await pool.query(
      `INSERT INTO eventos
         (nombre, sede, edicion, fecha_inicio, fecha_fin, estado, visible_roles,
          descripcion, imagen_url, es_activo, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false,$10)
       RETURNING *`,
      [
        nombre.trim(),
        sede.toLowerCase().trim(),
        parseInt(edicion),
        fecha_inicio || null,
        fecha_fin    || null,
        estado,
        JSON.stringify(Array.isArray(visible_roles) ? visible_roles : ['todos']),
        descripcion  || null,
        imagen_url   || null,
        req.user.id,
      ]
    );

    console.log(`[Eventos] Creado: ${r.rows[0].nombre} (${sede} ${edicion})`);
    res.status(201).json({ ok: true, evento: r.rows[0] });
  } catch (err) {
    console.error('[Eventos] POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/eventos/:id ───────────────────────────────── (super_admin)
router.put('/:id', authRequired, async (req, res) => {
  try {
    if (req.user?.rol !== 'super_admin')
      return res.status(403).json({ error: 'Solo super_admin puede editar eventos' });

    const { id } = req.params;
    const {
      nombre, sede, edicion, fecha_inicio, fecha_fin,
      estado, visible_roles, descripcion, imagen_url,
    } = req.body;

    if (estado && !ESTADOS_VALIDOS.includes(estado))
      return res.status(400).json({ error: `estado inválido: ${ESTADOS_VALIDOS.join(', ')}` });

    const r = await pool.query(
      `UPDATE eventos SET
        nombre        = COALESCE($1, nombre),
        sede          = COALESCE($2, sede),
        edicion       = COALESCE($3, edicion),
        fecha_inicio  = COALESCE($4, fecha_inicio),
        fecha_fin     = COALESCE($5, fecha_fin),
        estado        = COALESCE($6, estado),
        visible_roles = COALESCE($7, visible_roles),
        descripcion   = COALESCE($8, descripcion),
        imagen_url    = COALESCE($9, imagen_url),
        updated_at    = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        nombre?.trim()   || null,
        sede?.toLowerCase().trim() || null,
        edicion ? parseInt(edicion) : null,
        fecha_inicio || null,
        fecha_fin    || null,
        estado       || null,
        visible_roles ? JSON.stringify(Array.isArray(visible_roles)?visible_roles:['todos']) : null,
        descripcion !== undefined ? descripcion : null,
        imagen_url  !== undefined ? imagen_url  : null,
        id,
      ]
    );

    if (!r.rows.length) return res.status(404).json({ error: 'Evento no encontrado' });
    console.log(`[Eventos] Actualizado: ${r.rows[0].nombre}`);
    res.json({ ok: true, evento: r.rows[0] });
  } catch (err) {
    console.error('[Eventos] PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/eventos/:id ────────────────────────────── (super_admin)
router.delete('/:id', authRequired, async (req, res) => {
  try {
    if (req.user?.rol !== 'super_admin')
      return res.status(403).json({ error: 'Solo super_admin puede eliminar eventos' });

    const { id } = req.params;
    // No permitir eliminar el evento activo
    const check = await pool.query('SELECT es_activo, nombre FROM eventos WHERE id=$1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'No encontrado' });
    if (check.rows[0].es_activo)
      return res.status(400).json({ error: 'No se puede eliminar el evento activo. Desactívalo primero.' });

    await pool.query('DELETE FROM eventos WHERE id=$1', [id]);
    console.log(`[Eventos] Eliminado: ${check.rows[0].nombre}`);
    res.json({ ok: true, message: 'Evento eliminado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/eventos/:id/estado ─────────────────────── (super_admin)
router.patch('/:id/estado', authRequired, async (req, res) => {
  try {
    if (req.user?.rol !== 'super_admin')
      return res.status(403).json({ error: 'Sin permisos' });

    const { id } = req.params;
    const { estado } = req.body;

    if (!ESTADOS_VALIDOS.includes(estado))
      return res.status(400).json({ error: `Estado inválido. Opciones: ${ESTADOS_VALIDOS.join(', ')}` });

    const r = await pool.query(
      `UPDATE eventos SET estado=$1, updated_at=NOW() WHERE id=$2 RETURNING id, nombre, estado`,
      [estado, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'No encontrado' });

    console.log(`[Eventos] Estado: ${r.rows[0].nombre} → ${estado}`);
    res.json({ ok: true, evento: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/eventos/:id/activar ────────────────────── (super_admin)
// Marca este evento como el activo global y sincroniza config + calendario_sedes
router.patch('/:id/activar', authRequired, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user?.rol !== 'super_admin')
      return res.status(403).json({ error: 'Sin permisos' });

    const { id } = req.params;
    await client.query('BEGIN');

    // Desactivar todos
    await client.query('UPDATE eventos SET es_activo=false, updated_at=NOW()');

    // Activar el seleccionado y marcar como activo
    const r = await client.query(
      `UPDATE eventos SET es_activo=true, estado='activo', updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [id]
    );
    if (!r.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'No encontrado' }); }

    const ev = r.rows[0];

    // Sincronizar tabla config
    await client.query(
      `INSERT INTO config (id, sede_activa, edicion_activa, updated_at)
       VALUES (1, $1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET sede_activa=$1, edicion_activa=$2, updated_at=NOW()`,
      [ev.sede, ev.edicion]
    );

    // Sincronizar calendario_sedes si tiene fechas
    if (ev.fecha_inicio && ev.fecha_fin) {
      await client.query(
        `INSERT INTO calendario_sedes (sede, edicion, fecha_inicio, fecha_fin, activo)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT DO NOTHING`,
        [ev.sede, ev.edicion, ev.fecha_inicio, ev.fecha_fin]
      ).catch(() => {}); // no fallar si ya existe
    }

    await client.query('COMMIT');
    console.log(`[Eventos] ✅ Evento activo: ${ev.nombre} (${ev.sede} ${ev.edicion})`);
    res.json({ ok: true, evento: ev, mensaje: `${ev.nombre} activado. La app ahora muestra este evento.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Eventos] PATCH activar error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ── GET /api/eventos/sedes-calendario ──────────────────── (admin/staff)
// Retorna el estado de calendario_sedes para gestión simultánea
router.get('/sedes-calendario', authRequired, async (req, res) => {
  try {
    if (!['super_admin','staff'].includes(req.user?.rol))
      return res.status(403).json({ error: 'Sin permisos' });

    const r = await pool.query(
      `SELECT * FROM calendario_sedes ORDER BY edicion DESC, sede ASC`
    );
    res.json({ ok: true, sedes: r.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/eventos/sedes-calendario/:sede/:edicion ───── (super_admin)
router.put('/sedes-calendario/:sede/:edicion', authRequired, async (req, res) => {
  try {
    if (req.user?.rol !== 'super_admin')
      return res.status(403).json({ error: 'Sin permisos' });

    const { sede, edicion } = req.params;
    const { fecha_inicio, fecha_fin, activo, mes_evento } = req.body;

    const r = await pool.query(
      `INSERT INTO calendario_sedes (sede, edicion, fecha_inicio, fecha_fin, activo, mes_evento)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (sede, edicion) DO UPDATE SET
         fecha_inicio = COALESCE($3, calendario_sedes.fecha_inicio),
         fecha_fin    = COALESCE($4, calendario_sedes.fecha_fin),
         activo       = COALESCE($5, calendario_sedes.activo),
         mes_evento   = COALESCE($6, calendario_sedes.mes_evento)
       RETURNING *`,
      [
        sede.toLowerCase(), parseInt(edicion),
        fecha_inicio || null,
        fecha_fin    || null,
        activo !== undefined ? activo : true,
        mes_evento ? parseInt(mes_evento) : null,
      ]
    );
    res.json({ ok: true, sede: r.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;