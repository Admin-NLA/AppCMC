import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import API from "../services/api";

export default function ExcelImport() {
  const [activeTab, setActiveTab] = useState("usuarios");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [progress, setProgress] = useState(0);

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
  const importExpositores = async () => {
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

          console.log("📝 Importando expositores:", datos.length);

          let successCount = 0;
          let errorCount = 0;
          const errors = [];

          for (let i = 0; i < datos.length; i++) {
            const row = datos[i];
            setProgress(Math.round(((i + 1) / datos.length) * 100));

            if (!row.nombre || !row.categoria) {
              errors.push(`Fila ${i + 2}: Nombre y categoría son requeridos`);
              errorCount++;
              continue;
            }

            try {
              await API.post("/expositores", {
                nombre: row.nombre.trim(),
                categoria: row.categoria.trim(),
                logo_url: row.logo_url || "",
                website: row.website_url || row.website || "",
                stand: row.stand || "",
                descripcion: row.descripcion || "",
                sede: row.sede || "chile",
              });
              successCount++;
            } catch (err) {
              errorCount++;
              errors.push(
                `Fila ${i + 2} (${row.nombre}): ${err.response?.data?.error || err.message}`
              );
            }
          }

          setSuccess(
            `✅ Importación completada: ${successCount} expositores creados, ${errorCount} errores`
          );
          if (errors.length > 0) {
            console.error("Errores:", errors);
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
  // IMPORTAR SPEAKERS
  // ========================================================
  const importSpeakers = async () => {
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

          console.log("📝 Importando speakers:", datos.length);

          let successCount = 0;
          let errorCount = 0;
          const errors = [];

          for (let i = 0; i < datos.length; i++) {
            const row = datos[i];
            setProgress(Math.round(((i + 1) / datos.length) * 100));

            if (!row.nombre) {
              errors.push(`Fila ${i + 2}: Nombre es requerido`);
              errorCount++;
              continue;
            }

            try {
              await API.post("/speakers", {
                nombre: row.nombre.trim(),
                bio: row.bio || "",
                cargo: row.cargo || "",
                company: row.company || row.empresa || "",
                photo_url: row.photo_url || "",
                email: row.email || "",
                telefono: row.telefono || "",
                linkedin_url: row.linkedin_url || row.linkedin || "",
                twitter_url: row.twitter_url || row.twitter || "",
                website_url: row.website_url || row.website || "",
                sede: row.sede || "chile",
                edicion: row.edicion || 2025,
              });
              successCount++;
            } catch (err) {
              errorCount++;
              errors.push(
                `Fila ${i + 2} (${row.nombre}): ${err.response?.data?.error || err.message}`
              );
            }
          }

          setSuccess(
            `✅ Importación completada: ${successCount} speakers creados, ${errorCount} errores`
          );
          if (errors.length > 0) {
            console.error("Errores:", errors);
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
  // DESCARGAR TEMPLATE
  // ========================================================
  const downloadTemplate = (tipo) => {
    let data = [];

    if (tipo === "usuarios") {
      data = [
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
    } else if (tipo === "expositores") {
      data = [
        {
          nombre: "Empresa Tech",
          categoria: "Tecnología",
          logo_url: "https://ejemplo.com/logo.png",
          website_url: "https://empresatech.com",
          stand: "A-101",
          descripcion: "Empresa de soluciones tecnológicas",
          sede: "chile",
        },
        {
          nombre: "Consultora Innovación",
          categoria: "Consultoría",
          logo_url: "https://ejemplo.com/logo2.png",
          website_url: "https://consultora.com",
          stand: "B-205",
          descripcion: "Consultora en innovación digital",
          sede: "mexico",
        },
      ];
    } else if (tipo === "speakers") {
      data = [
        {
          nombre: "María García",
          bio: "Experta en transformación digital",
          cargo: "Directora de Innovación",
          company: "Tech Solutions",
          photo_url: "https://ejemplo.com/maria.jpg",
          email: "maria@tech.com",
          telefono: "+56912345678",
          linkedin_url: "https://linkedin.com/in/maria",
          twitter_url: "https://twitter.com/maria",
          website_url: "https://mariagarcia.com",
          sede: "chile",
          edicion: 2025,
        },
        {
          nombre: "Carlos López",
          bio: "Especialista en IA y Machine Learning",
          cargo: "Tech Lead",
          company: "AI Labs",
          photo_url: "https://ejemplo.com/carlos.jpg",
          email: "carlos@ailabs.com",
          telefono: "+524771234567",
          linkedin_url: "https://linkedin.com/in/carlos",
          twitter_url: "https://twitter.com/carlos",
          website_url: "https://carloslopez.dev",
          sede: "mexico",
          edicion: 2025,
        },
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    XLSX.writeFile(workbook, `template_${tipo}.xlsx`);
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
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            activeTab === "usuarios"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          👥 Usuarios
        </button>
        <button
          onClick={() => {
            setActiveTab("expositores");
            setFile(null);
            setPreview([]);
            setError(null);
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            activeTab === "expositores"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          🏢 Expositores
        </button>
        <button
          onClick={() => {
            setActiveTab("speakers");
            setFile(null);
            setPreview([]);
            setError(null);
          }}
          className={`px-4 py-2 rounded-lg font-semibold transition ${
            activeTab === "speakers"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-200"
          }`}
        >
          🎤 Speakers
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

        {/* Descarga de template */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="font-semibold text-blue-900 mb-2">📥 Descarga un template</p>
          <button
            onClick={() => downloadTemplate(activeTab)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Descargar Template Excel
          </button>
        </div>

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
                else if (activeTab === "expositores") importExpositores();
                else if (activeTab === "speakers") importSpeakers();
              }}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
            >
              {loading ? "Importando..." : `✅ Importar ${activeTab}`}
            </button>
            <button
              onClick={() => {
                setFile(null);
                setPreview([]);
                setError(null);
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
        <ol className="space-y-2 text-sm text-gray-700">
          <li>1. Selecciona el tipo de dato que quieres importar (Usuarios, Expositores o Speakers)</li>
          <li>2. Descarga el template Excel haciendo click en "Descargar Template Excel"</li>
          <li>3. Abre el template en Excel y completa tus datos</li>
          <li>4. Guarda el archivo en formato .xlsx</li>
          <li>5. Sube el archivo en la zona de carga</li>
          <li>6. Verifica la vista previa y haz click en "Importar"</li>
          <li>7. ¡Listo! Los datos se importarán automáticamente</li>
        </ol>
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

        {activeTab === "expositores" && (
          <ul className="text-sm space-y-1 text-gray-700">
            <li>✓ <strong>nombre</strong> - Nombre de la empresa</li>
            <li>✓ <strong>categoria</strong> - Categoría</li>
            <li>○ logo_url</li>
            <li>○ website_url</li>
            <li>○ stand</li>
            <li>○ descripcion</li>
            <li>○ sede - Default: chile</li>
          </ul>
        )}

        {activeTab === "speakers" && (
          <ul className="text-sm space-y-1 text-gray-700">
            <li>✓ <strong>nombre</strong> - Nombre completo</li>
            <li>○ bio</li>
            <li>○ cargo</li>
            <li>○ company - Empresa</li>
            <li>○ photo_url</li>
            <li>○ email</li>
            <li>○ telefono</li>
            <li>○ linkedin_url</li>
            <li>○ twitter_url</li>
            <li>○ website_url</li>
            <li>○ sede - Default: chile</li>
            <li>○ edicion - Default: 2025</li>
          </ul>
        )}
      </div>
    </div>
  );
}