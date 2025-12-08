import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Save } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function Perfil() {
  const { userProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: userProfile?.nombre || '',
    empresa: userProfile?.empresa || '',
    telefono: userProfile?.telefono || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, formData);
      alert('✅ Perfil actualizado');
      setEditing(false);
      window.location.reload();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mi Perfil</h1>

      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <User size={40} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{userProfile?.nombre}</h2>
            <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mt-1">
              {userProfile?.rol?.toUpperCase()}
            </span>
          </div>
        </div>

        {!editing ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-lg">{userProfile?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Empresa</label>
              <p className="text-lg">{userProfile?.empresa || 'No especificado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Teléfono</label>
              <p className="text-lg">{userProfile?.telefono || 'No especificado'}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Editar Perfil
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={e => setFormData({...formData, nombre: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Empresa</label>
              <input
                type="text"
                value={formData.empresa}
                onChange={e => setFormData({...formData, empresa: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                value={formData.telefono}
                onChange={e => setFormData({...formData, telefono: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={20} />
                Guardar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Personal */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Mi Código QR</h3>
        <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
          <QRCode value={userProfile?.qrCode || userProfile?.id} size={250} />
        </div>
        <p className="text-center text-sm text-gray-600 mt-4">
          Muestra este código para registrar tu asistencia
        </p>
      </div>
    </div>
  );
}
