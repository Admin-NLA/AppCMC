import express from 'express';
import pool from '../db.js';
import { authRequired } from '../utils/authMiddleware.js';
import ExcelJS from 'exceljs';

const router = express.Router();

const requireStaff = (req, res, next) => {
    if (req.user.rol !== 'staff' && req.user.rol !== 'super_admin') {
        return res.status(403).json({ error: 'Solo staff puede acceder' });
    }
    next();
};

// ========================================================
// GET /api/excel/estadisticas - Descarga Excel con 4 hojas
// ========================================================
router.get('/estadisticas', authRequired, requireStaff, async (req, res) => {
    try {
        const { sede } = req.query;
        const sedeFilter = sede ? `AND u.sede = '${sede}'` : '';
        const sedeFilterE = sede ? `AND e.sede = '${sede}'` : '';

        // ── Datos ──────────────────────────────────────────
        const [checkinsRes, usersRes, sesionesRes, cursosRes, networkingRes] = await Promise.all([
            pool.query(`
        SELECT
          e.id, e.user_id, e.dia, e.created_at AS fecha, e.sede,
          u.nombre, u.email, u.tipo_pase, u.empresa
        FROM entradas e
        JOIN users u ON u.id = e.user_id
        WHERE 1=1 ${sedeFilterE}
        ORDER BY e.created_at DESC
      `),
            pool.query(`
        SELECT id, nombre, email, tipo_pase, empresa, sede, created_at
        FROM users WHERE activo = true ${sede ? `AND sede = '${sede}'` : ''}
        ORDER BY nombre ASC
      `),
            pool.query(`
        SELECT a.id, a.user_id, a.fecha, ag.title AS sesion, ag.dia, ag.sala,
          u.nombre, u.email, u.tipo_pase, u.empresa
        FROM asistencias_sesion a
        JOIN users u ON u.id = a.user_id
        JOIN agenda ag ON ag.id = a.session_id
        ORDER BY a.fecha DESC
      `),
            pool.query(`
        SELECT ag.id, ag.title AS titulo, ag.dia, ag.sala,
          COUNT(a.id) AS asistentes
        FROM agenda ag
        LEFT JOIN asistencias_sesion a ON ag.id = a.session_id
        WHERE ag.activo = true AND ag.categoria = 'curso'
        GROUP BY ag.id, ag.title, ag.dia, ag.sala
        ORDER BY ag.dia, ag.title
      `),
            pool.query(`
        SELECT COUNT(*) AS total,
          COUNT(CASE WHEN status = 'confirmada' THEN 1 END) AS confirmadas,
          COUNT(CASE WHEN status = 'pendiente' THEN 1 END) AS pendientes,
          COUNT(CASE WHEN status = 'rechazada' THEN 1 END) AS rechazadas
        FROM networking ${sede ? `WHERE sede = '${sede}'` : ''}
      `)
        ]);

        const checkins = checkinsRes.rows;
        const usuarios = usersRes.rows;
        const sesiones = sesionesRes.rows;
        const cursos = cursosRes.rows;
        const networking = networkingRes.rows[0] || {};

        // ── Construir estadísticos ──────────────────────────
        const byTipo = usuarios.reduce((acc, u) => {
            acc[u.tipo_pase || 'otros'] = (acc[u.tipo_pase || 'otros'] || 0) + 1;
            return acc;
        }, {});

        const entradasPorDia = [1, 2, 3, 4].map(dia => {
            const del_dia = checkins.filter(c => c.dia === dia);
            return { dia, total: del_dia.length };
        });

        // ── Crear workbook ──────────────────────────────────
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'CMC Web App';
        workbook.created = new Date();

        const titleStyle = {
            font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A5C' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        };
        const headerStyle = {
            font: { bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } },
            alignment: { horizontal: 'center' },
            border: { bottom: { style: 'thin' } }
        };
        const altRow = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FF' } };

        // ════════════════════════════════════════════════════
        // HOJA 1 — ESCANEOS
        // ════════════════════════════════════════════════════
        const wsEscaneos = workbook.addWorksheet('Escaneos');
        wsEscaneos.mergeCells('A1:I1');
        wsEscaneos.getCell('A1').value = 'Congreso de Mantenimiento y Confiabilidad — Registro de Escaneos';
        wsEscaneos.getCell('A1').style = titleStyle;
        wsEscaneos.getRow(1).height = 28;

        wsEscaneos.getRow(2).values = ['#', 'Nombre', 'Email', 'Empresa', 'Tipo Pase', 'Día', 'Fecha', 'Hora', 'Sede'];
        wsEscaneos.getRow(2).eachCell(cell => { cell.style = headerStyle; });
        wsEscaneos.getRow(2).height = 22;

        wsEscaneos.columns = [
            { key: 'num', width: 6 },
            { key: 'nombre', width: 30 },
            { key: 'email', width: 32 },
            { key: 'empresa', width: 25 },
            { key: 'tipo_pase', width: 15 },
            { key: 'dia', width: 8 },
            { key: 'fecha', width: 14 },
            { key: 'hora', width: 12 },
            { key: 'sede', width: 14 },
        ];

        checkins.forEach((c, i) => {
            const fecha = new Date(c.fecha);
            const row = wsEscaneos.addRow({
                num: i + 1,
                nombre: c.nombre || '',
                email: c.email || '',
                empresa: c.empresa || '',
                tipo_pase: c.tipo_pase || '',
                dia: `Día ${c.dia || '—'}`,
                fecha: fecha.toLocaleDateString('es-MX'),
                hora: fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
                sede: c.sede || '',
            });
            if (i % 2 === 0) row.eachCell(cell => { cell.fill = altRow; });
        });

        // ════════════════════════════════════════════════════
        // HOJA 2 — ESTADÍSTICOS
        // ════════════════════════════════════════════════════
        const wsStats = workbook.addWorksheet('Estadísticos');
        wsStats.mergeCells('A1:F1');
        wsStats.getCell('A1').value = 'Congreso de Mantenimiento y Confiabilidad — Estadísticos Generales';
        wsStats.getCell('A1').style = titleStyle;
        wsStats.getRow(1).height = 28;

        wsStats.columns = [
            { width: 28 }, { width: 14 }, { width: 14 },
            { width: 14 }, { width: 14 }, { width: 14 }
        ];

        // Usuarios registrados
        wsStats.addRow([]);
        const hReg = wsStats.addRow(['USUARIOS REGISTRADOS', 'Total', 'Expositor', 'Ponente', 'Combo', 'Sesiones', 'Curso', 'Staff', 'Otros']);
        hReg.eachCell(cell => { cell.style = headerStyle; });
        wsStats.addRow([
            'Totales',
            usuarios.length,
            byTipo.expositor || 0,
            byTipo.ponente || 0,
            byTipo.combo || 0,
            byTipo.sesiones || 0,
            byTipo.curso || 0,
            byTipo.staff || 0,
            byTipo.otros || 0,
        ]);

        // Entradas por día
        wsStats.addRow([]);
        const hDia = wsStats.addRow(['ENTRADAS POR DÍA', 'Total Entradas']);
        hDia.eachCell(cell => { cell.style = headerStyle; });
        entradasPorDia.forEach(d => {
            wsStats.addRow([`Día ${d.dia}`, d.total]);
        });

        // Sesiones
        wsStats.addRow([]);
        const hSes = wsStats.addRow(['ASISTENCIA A SESIONES', 'Sesión', 'Sala', 'Día', 'Asistentes']);
        hSes.eachCell(cell => { cell.style = headerStyle; });
        sesiones.slice(0, 50).forEach(s => {
            wsStats.addRow(['', s.sesion || '', s.sala || '', `Día ${s.dia || ''}`, '']);
        });

        // Networking
        wsStats.addRow([]);
        const hNet = wsStats.addRow(['NETWORKING — CITAS', 'Total', 'Confirmadas', 'Pendientes', 'Rechazadas']);
        hNet.eachCell(cell => { cell.style = headerStyle; });
        wsStats.addRow(['Citas', networking.total || 0, networking.confirmadas || 0, networking.pendientes || 0, networking.rechazadas || 0]);

        // ════════════════════════════════════════════════════
        // HOJA 3 — ASISTENTES
        // ════════════════════════════════════════════════════
        const wsAsistentes = workbook.addWorksheet('Asistentes');
        wsAsistentes.mergeCells('A1:H1');
        wsAsistentes.getCell('A1').value = 'Congreso de Mantenimiento y Confiabilidad — Lista de Asistentes';
        wsAsistentes.getCell('A1').style = titleStyle;
        wsAsistentes.getRow(1).height = 28;

        wsAsistentes.columns = [
            { width: 12 }, { width: 30 }, { width: 32 },
            { width: 25 }, { width: 18 }, { width: 10 },
            { width: 10 }, { width: 10 }, { width: 10 }
        ];

        const hAs = wsAsistentes.addRow(['Email', 'Nombre', 'Email', 'Empresa', 'Tipo Pase', 'Día 1', 'Día 2', 'Día 3', 'Día 4']);
        hAs.eachCell(cell => { cell.style = headerStyle; });

        const entradasByUser = checkins.reduce((acc, c) => {
            if (!acc[c.user_id]) acc[c.user_id] = new Set();
            acc[c.user_id].add(c.dia);
            return acc;
        }, {});

        usuarios.forEach((u, i) => {
            const dias = entradasByUser[u.id] || new Set();
            const row = wsAsistentes.addRow([
                u.email || '',
                u.nombre || '',
                u.email || '',
                u.empresa || '',
                u.tipo_pase || '',
                dias.has(1) ? 'X' : '',
                dias.has(2) ? 'X' : '',
                dias.has(3) ? 'X' : '',
                dias.has(4) ? 'X' : '',
            ]);
            if (i % 2 === 0) row.eachCell(cell => { cell.fill = altRow; });
        });

        // ════════════════════════════════════════════════════
        // HOJA 4 — CURSOS
        // ════════════════════════════════════════════════════
        const wsCursos = workbook.addWorksheet('Cursos');
        wsCursos.mergeCells('A1:E1');
        wsCursos.getCell('A1').value = 'Congreso de Mantenimiento y Confiabilidad — Asistencia por Curso';
        wsCursos.getCell('A1').style = titleStyle;
        wsCursos.getRow(1).height = 28;

        wsCursos.columns = [
            { width: 40 }, { width: 20 }, { width: 10 }, { width: 16 }, { width: 14 }
        ];

        const hCur = wsCursos.addRow(['Curso', 'Sala', 'Día', 'Inscritos', 'Asistencias']);
        hCur.eachCell(cell => { cell.style = headerStyle; });

        cursos.forEach((c, i) => {
            const row = wsCursos.addRow([
                c.titulo || '',
                c.sala || '',
                `Día ${c.dia || ''}`,
                0,
                parseInt(c.asistentes) || 0,
            ]);
            if (i % 2 === 0) row.eachCell(cell => { cell.fill = altRow; });
        });

        // ── Enviar respuesta ────────────────────────────────
        const fecha = new Date().toISOString().split('T')[0];
        const filename = `estadisticas_cmc_${sede || 'todas'}__${fecha}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('❌ Error generando Excel:', error.message);
        res.status(500).json({ error: 'Error al generar Excel', details: error.message });
    }
});

export default router;