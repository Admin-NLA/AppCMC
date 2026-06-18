import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import API from "../services/api";
import { Users, CheckCircle, Clock, XCircle, Phone, Mail, Building, FileText } from "lucide-react";

export default function NetworkingExpo() {
    const { userProfile } = useAuth();
    const [contactos, setContactos] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState("todos");
    const [busqueda, setBusqueda] = useState("");
    const [detalle, setDetalle] = useState(null);

    const esAdmin = userProfile?.rol === "super_admin" || userProfile?.rol === "staff";

    useEffect(() => {
        cargarContactos();
    }, []);

    const cargarContactos = async () => {
        try {
            setLoading(true);
            const empresa = userProfile?.empresa || userProfile?.company || "";
            const url = esAdmin
                ? "/networking-expo/contactos"
                : `/networking-expo/contactos?empresa=${encodeURIComponent(empresa)}`;
            const res = await API.get(url);
            setContactos(res.data.contactos || []);
            setStats(res.data.stats || null);
        } catch (err) {
            setError("No se pudieron cargar los contactos");
        } finally {
            setLoading(false);
        }
    };

    const estadoCita = (cita) => {
        if (!cita) return { label: "Sin cita", color: "bg-gray-100 text-gray-600" };
        if (cita.completada === true) return { label: "Completada", color: "bg-green-100 text-green-700" };
        if (cita.completada === false) return { label: "No asistió", color: "bg-red-100 text-red-700" };
        return { label: "Pendiente", color: "bg-amber-100 text-amber-700" };
    };

    const contactosFiltrados = contactos.filter(c => {
        const matchFiltro =
            filtro === "todos" ? true :
                filtro === "con_cita" ? !!c.cita :
                    filtro === "sin_cita" ? !c.cita :
                        filtro === "completada" ? c.cita?.completada === true :
                            filtro === "pendiente" ? c.cita?.completada === null :
                                filtro === "perdida" ? c.cita?.completada === false : true;

        const matchBusqueda = !busqueda ||
            c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            c.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
            c.email.toLowerCase().includes(busqueda.toLowerCase());

        return matchFiltro && matchBusqueda;
    });

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
        </div>
    );

    if (error) return (
        <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-red-700">{error}</div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Networking</h1>
                <p className="text-gray-500 text-sm mt-1">Contactos escaneados y citas agendadas</p>
            </div>

            {/* KPIs */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <KPI icon={<Users size={22} className="text-blue-600" />}
                        label="Total contactos" value={stats.total_contactos} color="blue" />
                    <KPI icon={<CheckCircle size={22} className="text-green-600" />}
                        label="Citas completadas" value={stats.citas_completadas} color="green" />
                    <KPI icon={<Clock size={22} className="text-amber-600" />}
                        label="Citas pendientes" value={stats.citas_pendientes} color="amber" />
                    <KPI icon={<XCircle size={22} className="text-red-600" />}
                        label="No asistieron" value={stats.citas_perdidas} color="red" />
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    placeholder="Buscar por nombre, empresa o email..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <div className="flex gap-2 flex-wrap">
                    {[
                        { id: "todos", label: "Todos" },
                        { id: "con_cita", label: "Con cita" },
                        { id: "sin_cita", label: "Sin cita" },
                        { id: "completada", label: "Completadas" },
                        { id: "pendiente", label: "Pendientes" },
                        { id: "perdida", label: "No asistieron" },
                    ].map(f => (
                        <button key={f.id}
                            onClick={() => setFiltro(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filtro === f.id
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >{f.label}</button>
                    ))}
                </div>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-500">{contactosFiltrados.length} contacto{contactosFiltrados.length !== 1 ? "s" : ""}</span>
                </div>

                {contactosFiltrados.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Users size={40} className="mx-auto mb-3 opacity-40" />
                        <p>No hay contactos para mostrar</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {contactosFiltrados.map(c => {
                            const estado = estadoCita(c.cita);
                            return (
                                <div key={c.id}
                                    className="px-6 py-4 hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => setDetalle(c)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-semibold text-gray-900 truncate">{c.nombre}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>
                                                    {estado.label}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                                                {c.empresa && <span className="flex items-center gap-1"><Building size={13} />{c.empresa}</span>}
                                                {c.email && <span className="flex items-center gap-1"><Mail size={13} />{c.email}</span>}
                                                {c.telefono && <span className="flex items-center gap-1"><Phone size={13} />{c.telefono}</span>}
                                            </div>
                                            {c.notas && (
                                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <FileText size={12} />{c.notas}
                                                </p>
                                            )}
                                        </div>
                                        {c.cita && (
                                            <div className="text-right text-xs text-gray-400 shrink-0 ml-4">
                                                <p className="font-medium text-gray-600">{c.cita.fecha}</p>
                                                <p>{c.cita.hora}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal detalle */}
            {detalle && <DetalleContacto contacto={detalle} onClose={() => setDetalle(null)} estadoCita={estadoCita} />}
        </div>
    );
}

function KPI({ icon, label, value, color }) {
    const bg = { blue: "bg-blue-50", green: "bg-green-50", amber: "bg-amber-50", red: "bg-red-50" };
    return (
        <div className={`${bg[color]} rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-gray-500">{label}</span></div>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    );
}

function DetalleContacto({ contacto: c, onClose, estadoCita }) {
    const estado = estadoCita(c.cita);
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">{c.nombre}</h2>
                        <p className="text-gray-500 text-sm">{c.empresa}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    {c.email && <Info icon={<Mail size={14} />} label="Email" value={c.email} />}
                    {c.telefono && <Info icon={<Phone size={14} />} label="Teléfono" value={c.telefono} />}
                    {c.notas && <Info icon={<FileText size={14} />} label="Notas" value={c.notas} className="col-span-2" />}
                </div>

                {c.cita ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-700">Cita agendada</p>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>{estado.label}</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>📅 {c.cita.fecha} a las {c.cita.hora}</p>
                            {c.cita.lugar && <p>📍 {c.cita.lugar}</p>}
                            {c.cita.descripcion && <p>📝 {c.cita.descripcion}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-400 text-sm">Sin cita agendada</div>
                )}

                <button onClick={onClose} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition">
                    Cerrar
                </button>
            </div>
        </div>
    );
}

function Info({ icon, label, value, className = "" }) {
    return (
        <div className={`bg-white border border-gray-100 rounded-lg p-3 ${className}`}>
            <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">{icon}{label}</p>
            <p className="font-medium text-gray-800 text-sm break-all">{value}</p>
        </div>
    );
}