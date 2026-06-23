import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import API from "../services/api";

export default function ExcelImport() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);

  // Estado específico del tab "Asistentes CMC" (Tkinter) — 3 hojas a la vez
  const [cmcResumen, setCmcResumen] = useState(null); // { asistentes: [...], expositores: [...], speakers: [...] }
  const [cmcSeleccion, setCmcSeleccion] = useState({ asistentes: true, expositores: true, speakers: true });

  // ========================================================
  // LEER ARCHIVO EXCEL
  // ========================================================
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
      setError("Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV");
      return;
    }

    if (activeTab === "asistentes_cmc") {
      handleFileCMC(selectedFile);
      return;
    }

    setFile(selectedFile);
    setError(null);
    readExcelFile(selectedFile);
  };

  const readExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
          setError("El archivo está vacío");
          return;
        }

        setPreview(data.slice(0, 5)); // Mostrar primeras 5 filas
        console.log("📊 Datos leídos:", data);
      } catch (err) {
        setError("Error al leer el archivo: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // ========================================================
  // ASISTENTES CMC (Tkinter) — lee 3 hojas del mismo Excel:
  // "Asistentes", "Expositores", "Ponentes y Staff"
  // ========================================================

  // Busca la fila de encabezados reales (las primeras filas pueden
  // tener fórmulas/títulos antes de la fila real de columnas)
  const findHeaderRowIndex = (rows, requiredCols) => {
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i] || [];
      const upper = row.map((c) => String(c || "").trim().toUpperCase());
      if (requiredCols.every((col) => upper.some((c) => c.includes(col)))) {
        return i;
      }
    }
    return -1;
  };

  const sheetToObjects = (workbook, sheetName, requiredCols) => {
    if (!workbook.SheetNames.includes(sheetName)) return [];
    const ws = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    const headerIdx = findHeaderRowIndex(rows, requiredCols);
    if (headerIdx === -1) return [];

    const headers = rows[headerIdx].map((h) => String(h || "").trim());
    const dataRows = rows.slice(headerIdx + 1);

    return dataRows
      .map((r) => {
        const obj = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = r[idx] !== undefined ? r[idx] : "";
        });
        return obj;
      })
      .filter((obj) => Object.values(obj).some((v) => String(v).trim() !== ""));
  };

  const limpiarEmail = (v) => String(v || "").trim().toLowerCase();
  const limpiarTexto = (v) => String(v || "").trim();

  // El backend exige contraseña mínima de 8 caracteres. Los ID del Excel
  // (ej: "0001") son más cortos, así que se prefija con "cmc-" para
  // garantizar el mínimo sin perder la relación directa con su ID
  // (la persona puede deducir su contraseña fácilmente: cmc-<su ID>).
  const passwordDesdeId = (id) => {
    const limpio = String(id || "").trim();
    const candidato = `cmc-${limpio}`;
    return candidato.length >= 8 ? candidato : candidato.padEnd(8, "0");
  };

  // Mapear hoja "Asistentes" → payload de usuario
  const mapAsistente = (row) => {
    const id = limpiarTexto(row["ID"]);
    const correo = limpiarEmail(row["CORREO "] || row["CORREO"]);
    const nombre = limpiarTexto(row["NOMBRE(S) ASISTENTE "] || row["NOMBRE(S) ASISTENTE"] || row["NOMBRE(S)"]);
    const apellido = limpiarTexto(row["APELLIDO (S)"] || row["APELLIDOS"]);
    const empresa = limpiarTexto(row["EMPRESA"]);
    const telefono = limpiarTexto(row["TELÉFONO"] || row["TELEFONO"]);
    const curso = limpiarTexto(row["CURSO"]);
    const sesiones = limpiarTexto(row["SESIONES"]);

    if (!id || !correo) return null;

    let tipo_pase = "general";
    if (curso && sesiones) tipo_pase = "combo";
    else if (curso) tipo_pase = "curso";
    else if (sesiones) tipo_pase = "sesiones";

    return {
      _grupo: "asistentes",
      qr_code: id,
      email: correo,
      password: passwordDesdeId(id), // ej: "cmc-0001" — garantiza mínimo 8 caracteres
      nombre: `${nombre} ${apellido}`.trim(),
      rol: `asistente_${tipo_pase === "combo" ? "combo" : tipo_pase === "curso" ? "curso" : tipo_pase === "sesiones" ? "sesiones" : "general"}`,
      tipo_pase,
      empresa,
      telefono,
      sede: "colombia",
    };
  };

  // Mapear hoja "Expositores" → payload de usuario
  const mapExpositor = (row) => {
    const id = limpiarTexto(row["ID"]);
    const correo = limpiarEmail(row["CORREO"]);
    const nombre = limpiarTexto(row["NOMBRE(S)"]);
    const apellido = limpiarTexto(row["APELLIDOS"] || row["APELLIDO (S)"]);
    const empresa = limpiarTexto(row["EMPRESA"]);
    const telefono = limpiarTexto(row["TELEFONO"] || row["TELÉFONO"]);

    if (!id || !correo) return null;

    return {
      _grupo: "expositores",
      qr_code: id,
      email: correo,
      password: passwordDesdeId(id),
      nombre: `${nombre} ${apellido}`.trim(),
      rol: "expositor",
      tipo_pase: "expositor",
      empresa,
      telefono,
      sede: "colombia",
    };
  };

  // Mapear hoja "Ponentes y Staff" → payload de usuario
  // Solo se importan filas con TIPO DE ASISTENCIA = "PONENTE"
  // (el Staff interno no necesita cuenta de asistente en la App Web)
  const mapSpeaker = (row) => {
    const id = limpiarTexto(row["FOLIO"]);
    const correo = limpiarEmail(row["CORREO"]);
    const nombre = limpiarTexto(row["NOMBRE(S)"]);
    const apellido = limpiarTexto(row["APELLIDO (S)"] || row["APELLIDOS"]);
    const empresa = limpiarTexto(row["EMPRESA"]);
    const telefono = limpiarTexto(row["TELEFONO"] || row["TELÉFONO"]);
    const tipoAsistencia = limpiarTexto(row["TIPO DE ASISTENCIA"]).toUpperCase();

    if (!id || !correo) return null;
    if (tipoAsistencia && tipoAsistencia !== "PONENTE") return null; // omitir Staff

    return {
      _grupo: "speakers",
      qr_code: id,
      email: correo,
      password: passwordDesdeId(id),
      nombre: `${nombre} ${apellido}`.trim(),
      rol: "speaker",
      tipo_pase: "speaker",
      empresa,
      telefono,
      sede: "colombia",
    };
  };

  // Leer las 3 hojas del archivo y construir el resumen para preview
  const handleFileCMC = (selectedFile) => {
    setFile(selectedFile);
    setError(null);
    setSuccess(null);
    setCmcResumen(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });

        const asistentesRaw = sheetToObjects(workbook, "Asistentes", ["ID", "CORREO"]);
        const expositoresRaw = sheetToObjects(workbook, "Expositores", ["ID", "CORREO"]);
        const speakersRaw = sheetToObjects(workbook, "Ponentes y Staff", ["FOLIO", "CORREO"]);

        const asistentes = asistentesRaw.map(mapAsistente).filter(Boolean);
        const expositores = expositoresRaw.map(mapExpositor).filter(Boolean);
        const speakers = speakersRaw.map(mapSpeaker).filter(Boolean);

        if (asistentes.length === 0 && expositores.length === 0 && speakers.length === 0) {
          setError(
            "No se encontraron filas válidas. Verifica que el archivo tenga las hojas " +
            '"Asistentes", "Expositores" y/o "Ponentes y Staff" con columnas ID/FOLIO y CORREO.'
          );
          return;
        }

        setCmcResumen({ asistentes, expositores, speakers });
        setPreview(
          [...asistentes.slice(0, 2), ...expositores.slice(0, 2), ...speakers.slice(0, 2)].map((p) => ({
            Grupo: p._grupo,
            ID: p.qr_code,
            Nombre: p.nombre,
            Email: p.email,
            Rol: p.rol,
          }))
        );
      } catch (err) {
        setError("Error al leer el archivo: " + err.message);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // Importar los grupos seleccionados, uno por uno, omitiendo duplicados (409)
  const importarCMC = async () => {
    if (!cmcResumen) return;

    const payloads = [
      ...(cmcSeleccion.asistentes ? cmcResumen.asistentes : []),
      ...(cmcSeleccion.expositores ? cmcResumen.expositores : []),
      ...(cmcSeleccion.speakers ? cmcResumen.speakers : []),
    ];

    if (payloads.length === 0) {
      setError("Selecciona al menos un grupo para importar");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    let creados = 0;
    let omitidos = 0;
    let errores = 0;
    const detalleErrores = [];

    for (let i = 0; i < payloads.length; i++) {
      const { _grupo, ...payload } = payloads[i];
      try {
        await API.post("/users", payload);
        creados++;
      } catch (err) {
        const status = err.response?.status;
        if (status === 409) {
          omitidos++; // ya existía (email o qr_code duplicado) — esperado en re-importaciones
        } else {
          errores++;
          detalleErrores.push(`${payload.email}: ${err.response?.data?.error || err.message}`);
        }
      }
      setProgress(Math.round(((i + 1) / payloads.length) * 100));
    }

    setLoading(false);
    setProgress(0);
    setSuccess(
      `✅ ${creados} usuarios creados, ${omitidos} ya existían (omitidos)${errores > 0 ? `, ${errores} con error` : ""}`
    );
    if (detalleErrores.length > 0) {
      console.error("Errores de importación CMC:", detalleErrores);
    }
    setFile(null);
    setPreview([]);
    setCmcResumen(null);
  };

  // ========================================================
  // IMPORTAR USUARIOS
  // ========================================================
  const importUsuarios = async () => {
    if (!file) {
      setError("Selecciona un archivo primero");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: "binary" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const datos = XLSX.utils.sheet_to_json(worksheet);

          console.log("📝 Importando usuarios:", datos.length);

          let successCount = 0;
          let errorCount = 0;
          const errors = [];

          for (let i = 0; i < datos.length; i++) {
            const row = datos[i];
            setProgress(Math.round(((i + 1) / datos.length) * 100));

            // Validar datos requeridos
            if (!row.email || !row.nombre || !row.password) {
              errors.push(`Fila ${i + 2}: Email, nombre y contraseña son requeridos`);
              errorCount++;
              continue;
            }

            try {
              await API.post("/auth/register", {
                email: row.email.trim(),
                nombre: row.nombre.trim(),
                password: row.password.trim(),
                rol: row.rol || "asistente",
                tipo_pase: row.tipo_pase || "general",
                sede: row.sede || "chile",
                empresa: row.empresa || "",
                movil: row.movil || "",
              });
              successCount++;
            } catch (err) {
              errorCount++;
              errors.push(
                `Fila ${i + 2} (${row.email}): ${err.response?.data?.error || err.message}`
              );
            }
          }

          setSuccess(
            `✅ Importación completada: ${successCount} usuarios creados, ${errorCount} errores`
          );
          if (errors.length > 0) {
            console.error("Errores:", errors);
            setError(`⚠️ ${errors.length} errores durante la importación`);
          }

          setFile(null);
          setPreview([]);
          setProgress(0);
        } catch (err) {
          setError("Error al procesar el archivo: " + err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      setError("Error: " + err.message);
      setLoading(false);
    }
  };

  // ========================================================
  // IMPORTAR EXPOSITORES
  // ========================================================
  const downloadTemplate = () => {
    const data = [
      {
        email: "usuario@ejemplo.com",
        nombre: "Juan Pérez",
        password: "MiPassword123!",
        rol: "asistente",
        tipo_pase: "general",
        sede: "chile",
        empresa: "Acme Corp",
        movil: "+56912345678",
      },
      {
        email: "admin@ejemplo.com",
        nombre: "Admin User",
        password: "AdminPass123!",
        rol: "admin",
        tipo_pase: "vip",
        sede: "mexico",
        empresa: "Admin Inc",
        movil: "+524771234567",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    XLSX.writeFile(workbook, "template_usuarios.xlsx");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">📊 Importar Datos desde Excel</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => {
            setActiveTab("usuarios");
            setFile(null);
            setPreview([]);
            setError(null);
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === "usuarios"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
            }`}
        >
          👥 Usuarios
        </button>
        <button
          onClick={() => {
            setActiveTab("asistentes_cmc");
            setFile(null);
            setPreview([]);
            setError(null);
            setCmcResumen(null);
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === "asistentes_cmc"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
            }`}
        >
          🎟 Asistentes CMC
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex gap-3">
            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-green-800">Éxito</p>
              <p className="text-green-700 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Descarga de template — no aplica al tab Asistentes CMC */}
        {activeTab !== "asistentes_cmc" && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="font-semibold text-blue-900 mb-2">📥 Descarga un template</p>
            <button
              onClick={() => downloadTemplate()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Descargar Template Excel
            </button>
          </div>
        )}

        {activeTab === "asistentes_cmc" && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-lg">
            <p className="font-semibold text-amber-900 mb-1">
              🎟 Importar desde el Excel del Tkinter
            </p>
            <p className="text-amber-800 text-sm">
              Sube directamente el archivo de Lista de Asistentes que usa el Tkinter
              (el mismo Excel del evento). El sistema detecta automáticamente las hojas{" "}
              <code className="bg-amber-200 px-1 rounded">Asistentes</code>,{" "}
              <code className="bg-amber-200 px-1 rounded">Expositores</code> y{" "}
              <code className="bg-amber-200 px-1 rounded">Ponentes y Staff</code>.
            </p>
            <ul className="text-amber-800 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>La contraseña inicial será <code className="bg-amber-200 px-1 rounded">cmc-</code> + su ID/FOLIO (ej: <code className="bg-amber-200 px-1 rounded">cmc-0001</code>)</li>
              <li>El ID/FOLIO se guarda como <code>qr_code</code> para que el QR de la App Web funcione con el escáner del Tkinter</li>
              <li>Solo se importan filas con CORREO poblado</li>
              <li>De "Ponentes y Staff" solo se importan los marcados como PONENTE</li>
              <li>Si alguien ya existe (mismo email o ID), se omite sin error</li>
            </ul>
          </div>
        )}

        {/* Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="excelInput"
            disabled={loading}
          />
          <label htmlFor="excelInput" className="cursor-pointer block">
            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
            <p className="font-semibold text-gray-700">
              Arrastra tu archivo o haz click aquí
            </p>
            <p className="text-sm text-gray-500">Formatos soportados: .xlsx, .xls, .csv</p>
          </label>
        </div>

        {/* Resumen por grupo — solo tab Asistentes CMC */}
        {activeTab === "asistentes_cmc" && cmcResumen && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { key: "asistentes", label: "👥 Asistentes", activeCls: "border-blue-500 bg-blue-50" },
              { key: "expositores", label: "🏢 Expositores", activeCls: "border-green-500 bg-green-50" },
              { key: "speakers", label: "🎤 Speakers", activeCls: "border-purple-500 bg-purple-50" },
            ].map(({ key, label, activeCls }) => (
              <label
                key={key}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition ${cmcSeleccion[key] ? activeCls : "border-gray-200 bg-gray-50"
                  }`}
              >
                <div>
                  <p className="font-semibold text-gray-800">{label}</p>
                  <p className="text-sm text-gray-500">{cmcResumen[key].length} listos para importar</p>
                </div>
                <input
                  type="checkbox"
                  checked={cmcSeleccion[key]}
                  onChange={(e) => setCmcSeleccion({ ...cmcSeleccion, [key]: e.target.checked })}
                  className="w-5 h-5"
                />
              </label>
            ))}
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3">
              📋 Vista previa ({preview.length} filas)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    {Object.keys(preview[0] || {}).map((key) => (
                      <th key={key} className="px-4 py-2 text-left border">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {Object.values(row).map((val, i) => (
                        <td key={i} className="px-4 py-2 border">
                          {String(val).substring(0, 50)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress */}
        {loading && progress > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="font-semibold">Importando...</p>
              <p className="text-sm text-gray-600">{progress}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Botones de acción */}
        {file && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (activeTab === "usuarios") importUsuarios();
                else if (activeTab === "asistentes_cmc") importarCMC();
              }}
              disabled={loading || (activeTab === "asistentes_cmc" && !cmcResumen)}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
            >
              {loading
                ? "Importando..."
                : activeTab === "asistentes_cmc"
                  ? `✅ Importar seleccionados`
                  : `✅ Importar usuarios`}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setPreview([]);
                setError(null);
                setCmcResumen(null);
              }}
              disabled={loading}
              className="bg-gray-400 text-white px-6 py-3 rounded-lg hover:bg-gray-500 font-semibold disabled:opacity-50"
            >
              ❌ Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-bold text-lg mb-3">📖 Instrucciones:</h3>

        {activeTab === "asistentes_cmc" ? (
          <ol className="space-y-2 text-sm text-gray-700">
            <li>1. Abre el Excel de Lista de Asistentes que usa el Tkinter</li>
            <li>2. Sube el archivo completo aquí — no hace falta modificarlo ni separar hojas</li>
            <li>3. Verifica el resumen por grupo (Asistentes, Expositores, Speakers)</li>
            <li>4. Marca o desmarca los grupos que quieras importar</li>
            <li>5. Haz click en "Importar seleccionados"</li>
            <li>6. Cada persona podrá iniciar sesión con su email y la contraseña "cmc-" + su ID/FOLIO</li>
          </ol>
        ) : (
          <ol className="space-y-2 text-sm text-gray-700">
            <li>1. Descarga el template Excel haciendo click en "Descargar Template Excel"</li>
            <li>2. Abre el template en Excel y completa tus datos</li>
            <li>3. Guarda el archivo en formato .xlsx</li>
            <li>4. Sube el archivo en la zona de carga</li>
            <li>5. Verifica la vista previa y haz click en "Importar"</li>
            <li>6. ¡Listo! Los datos se importarán automáticamente</li>
          </ol>
        )}
      </div>

      {/* Campos requeridos por tipo */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h3 className="font-bold text-lg mb-3">✅ Campos Requeridos:</h3>

        {activeTab === "usuarios" && (
          <ul className="text-sm space-y-1 text-gray-700">
            <li>✓ <strong>email</strong> - Email único</li>
            <li>✓ <strong>nombre</strong> - Nombre completo</li>
            <li>✓ <strong>password</strong> - Mínimo 8 caracteres</li>
            <li>○ rol - (asistente, admin, super_admin) - Default: asistente</li>
            <li>○ tipo_pase - (general, vip, speaker, expositor, estudiante) - Default: general</li>
            <li>○ sede - (chile, mexico, colombia) - Default: chile</li>
            <li>○ empresa</li>
            <li>○ movil</li>
          </ul>
        )}

        {activeTab === "asistentes_cmc" && (
          <ul className="text-sm space-y-1 text-gray-700">
            <li>✓ <strong>ID / FOLIO</strong> — se usa para generar la contraseña inicial ("cmc-" + ID) y como qr_code</li>
            <li>✓ <strong>CORREO</strong> — email del usuario, único por persona</li>
            <li>○ Hoja "Asistentes": APELLIDO (S), NOMBRE(S) ASISTENTE, EMPRESA, CURSO, SESIONES</li>
            <li>○ Hoja "Expositores": APELLIDOS, NOMBRE(S), EMPRESA</li>
            <li>○ Hoja "Ponentes y Staff": solo filas con TIPO DE ASISTENCIA = PONENTE</li>
            <li className="mt-2 text-gray-500 italic">
              Sede fija: <strong>colombia</strong> · No requiere template — se usa el Excel real del Tkinter
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}