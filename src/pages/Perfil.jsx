import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import QRCode from "qrcode.react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Edit2,
  Save,
  X,
  AlertCircle,
  Download,
  Copy,
  Check,
  Camera,
  Loader,
} from "lucide-react";

export default function Perfil() {
  const { userProfile, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [copiedQR, setCopiedQR] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    empresa: "",
    cargo: "",
    ciudad: "",
    foto_url: "",
  });

  // ========================================================
  // Cargar datos del perfil al montar
  // ========================================================
  useEffect(() => {
    if (userProfile) {
      setFormData({
        nombre: userProfile.nombre || "",
        email: userProfile.email || "",
        telefono: userProfile.telefono || "",
        empresa: userProfile.empresa || "",
        cargo: userProfile.cargo || "",
        ciudad: userProfile.ciudad || "",
        foto_url: userProfile.foto_url || "",
      });
    }
  }, [userProfile]);

  // ========================================================
  // GENERAR vCARD
  // ========================================================
  const generateVCard = () => {
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${formData.nombre || userProfile?.nombre || ""}
N:${(formData.nombre || userProfile?.nombre || "").split(" ").reverse().join(";")};;;
EMAIL:${formData.email || userProfile?.email || ""}
TEL:${formData.telefono || userProfile?.telefono || ""}
ORG:${formData.empresa || userProfile?.empresa || ""}
TITLE:${formData.cargo || userProfile?.cargo || ""}
NICKNAME:CMC Attendee
URL:https://app-cmc.web.app
END:VCARD`;
    return vcard;
  };

  // ========================================================
  // DESCARGAR vCARD
  // ========================================================
  const downloadVCard = () => {
    const vcard = generateVCard();
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/vcard;charset=utf-8," + encodeURIComponent(vcard)
    );
    element.setAttribute(
      "download",
      `${userProfile?.nombre || "perfil"}.vcf`
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    console.log("✅ vCard descargada");
  };

  // ========================================================
  // COPIAR vCARD AL PORTAPAPELES
  // ========================================================
  const copyVCardToClipboard = () => {
    const vcard = generateVCard();
    navigator.clipboard.writeText(vcard);
    setCopiedQR(true);
    setTimeout(() => setCopiedQR(false), 2000);
    console.log("✅ vCard copiada al portapapeles");
  };

  // ========================================================
  // MANEJAR CAMBIOS EN FORMULARIO
  // ========================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ========================================================
  // UPLOAD DE FOTO
  // ========================================================
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      console.log("📸 Subiendo foto...", file.name);

      // Crear FormData para enviar archivo
      const formDataFile = new FormData();
      formDataFile.append("file", file);

      // Subir a API (endpoint debe estar en backend)
      const res = await API.post("/upload/photo", formDataFile, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Foto subida:", res.data);

      // Actualizar formulario con URL de foto
      setFormData((prev) => ({
        ...prev,
        foto_url: res.data.url,
      }));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("❌ Error al subir foto:", err);
      setError(err.response?.data?.error || "Error al subir la foto");
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ========================================================
  // GUARDAR PERFIL
  // ========================================================
  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      console.log("💾 Guardando perfil...", formData);

      const res = await API.put("/users/" + userProfile.id, formData);

      console.log("✅ Perfil guardado:", res.data);

      if (updateProfile) {
        updateProfile({
          ...userProfile,
          ...formData,
        });
      }

      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("❌ Error al guardar perfil:", err);
      setError(
        err.response?.data?.error || err.message || "Error al guardar el perfil"
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // CANCELAR EDICIÓN
  // ========================================================
  const handleCancel = () => {
    if (userProfile) {
      setFormData({
        nombre: userProfile.nombre || "",
        email: userProfile.email || "",
        telefono: userProfile.telefono || "",
        empresa: userProfile.empresa || "",
        cargo: userProfile.cargo || "",
        ciudad: userProfile.ciudad || "",
        foto_url: userProfile.foto_url || "",
      });
    }
    setIsEditing(false);
    setError(null);
  };

  // ========================================================
  // RENDERIZADO
  // ========================================================
  if (!userProfile) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Cargando perfil…
      </div>
    );
  }

  const vcard = generateVCard();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Mi Perfil</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <Edit2 size={18} />
            Editar Perfil
          </button>
        )}
      </div>

      {/* MENSAJES DE ESTADO */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6 flex items-start gap-3">
          <Check size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-900">Éxito</p>
            <p className="text-green-800 text-sm">Perfil actualizado correctamente</p>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA - Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* FOTO DE PERFIL */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Foto de Perfil</h2>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Foto actual */}
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden border-4 border-blue-200">
                {formData.foto_url ? (
                  <img
                    src={formData.foto_url}
                    alt="Perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={48} className="text-gray-400" />
                )}
              </div>

              {/* Botón Upload */}
              <div className="flex-1">
                <label className="block">
                  <div className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition cursor-pointer font-medium w-full sm:w-auto">
                    <Camera size={18} />
                    {uploadingPhoto ? "Subiendo..." : "Cambiar Foto"}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG. Máx 2MB</p>
              </div>
            </div>
          </div>

          {/* INFORMACIÓN PERSONAL */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Información Personal</h2>

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nombre Completo
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tu nombre"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 p-2">
                    <User size={18} className="text-blue-600" />
                    {formData.nombre || "No especificado"}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 p-2">
                    <Mail size={18} className="text-blue-600" />
                    {formData.email || "No especificado"}
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Teléfono
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+52 1234567890"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 p-2">
                    <Phone size={18} className="text-green-600" />
                    {formData.telefono || "No especificado"}
                  </div>
                )}
              </div>

              {/* Ciudad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ciudad
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Guadalajara, Jalisco"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 p-2">
                    <MapPin size={18} className="text-orange-600" />
                    {formData.ciudad || "No especificado"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INFORMACIÓN LABORAL */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Información Laboral</h2>

            <div className="space-y-4">
              {/* Empresa */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Empresa
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nombre de la empresa"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 p-2">
                    <Briefcase size={18} className="text-purple-600" />
                    {formData.empresa || "No especificado"}
                  </div>
                )}
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cargo / Posición
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Director, Manager, etc."
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-700 p-2">
                    <User size={18} className="text-indigo-600" />
                    {formData.cargo || "No especificado"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          {isEditing && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Guardar Cambios
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA - QR vCard */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-20">
            <h2 className="text-xl font-bold mb-4 text-center">Mi Tarjeta Digital</h2>

            {/* QR */}
            <div className="bg-blue-50 p-4 rounded-lg mb-4 flex justify-center">
              <QRCode
                value={vcard}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* Info QR */}
            <div className="bg-blue-50 p-3 rounded-lg mb-4 text-xs text-blue-800 border border-blue-200">
              <p className="font-semibold mb-1">📱 Código QR vCard</p>
              <p>Escanea para agregar mis datos a contactos</p>
            </div>

            {/* Botones */}
            <div className="space-y-2">
              <button
                onClick={downloadVCard}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
              >
                <Download size={16} />
                Descargar vCard
              </button>
              <button
                onClick={copyVCardToClipboard}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition font-semibold text-sm ${
                  copiedQR
                    ? "bg-green-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {copiedQR ? (
                  <>
                    <Check size={16} />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copiar vCard
                  </>
                )}
              </button>
            </div>

            {/* Detalles vCard */}
            <details className="mt-4 pt-4 border-t text-xs">
              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                Ver datos de vCard
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap break-words">
                {vcard}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}