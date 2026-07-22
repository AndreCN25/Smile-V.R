import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ShieldAlert, Key, CheckCircle, AlertCircle, Search, Power } from "lucide-react";
import { getUsers, createUser, updateUser, deleteUser, toggleUserActive, resetUserPassword } from "../../services/api";

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "Administrador" });
  const [resetData, setResetData] = useState({ id: "", newPassword: "" });

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error(e);
      setError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    } else {
      setEditingUser(null);
      setFormData({ name: "", email: "", password: "", role: "Administrador" });
    }
    setError("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setError("");
    if (!formData.name || !formData.email || (!editingUser && !formData.password)) {
      setError("Por favor completa los campos requeridos");
      return;
    }
    try {
      if (editingUser) {
        await updateUser(editingUser.id, { name: formData.name, email: formData.email, role: formData.role });
        showToast("Usuario actualizado");
      } else {
        await createUser({ name: formData.name, email: formData.email, password: formData.password, role: formData.role });
        showToast("Usuario creado");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (e: any) {
      setError(e.response?.data?.message || "Error al guardar usuario");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      try {
        await deleteUser(id);
        showToast("Usuario eliminado");
        fetchUsers();
      } catch (e) {
        alert("Error al eliminar usuario");
      }
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await toggleUserActive(id);
      showToast("Estado de usuario actualizado");
      fetchUsers();
    } catch (e) {
      alert("Error al cambiar estado");
    }
  };

  const handleOpenResetModal = (user: any) => {
    setResetData({ id: user.id, newPassword: "" });
    setError("");
    setIsResetModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetData.newPassword) {
      setError("La contraseña no puede estar vacía");
      return;
    }
    try {
      await resetUserPassword(resetData.id, resetData.newPassword);
      setIsResetModalOpen(false);
      showToast("Contraseña restablecida");
    } catch (e) {
      setError("Error al restablecer la contraseña");
    }
  };

  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  const inputStyle = {
    borderColor: "var(--border)",
    background: "var(--input-background)",
    color: "var(--foreground)"
  };

  return (
    <div className="p-4 md:p-6 w-full h-full flex flex-col min-h-0 bg-background" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium" style={{ background:"#ECFDF5", color:"#059669", border:"1px solid #D1FAE5" }}>
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
          <ShieldAlert className="w-6 h-6" style={{ color: "var(--primary)" }} /> Gestión de Usuarios
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Buscar usuario..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none" style={inputStyle} />
          </div>
          <button onClick={() => handleOpenModal()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 whitespace-nowrap" style={{ background: "var(--primary)" }}>
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl shadow-sm border flex-1 min-h-0 flex flex-col overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando usuarios...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No se encontraron usuarios.</div>
          ) : (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10 text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors" style={{ color: "var(--foreground)" }}>
                    <td className="px-6 py-4 font-medium">{user.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: user.role === "Developer" ? "rgba(124, 58, 237, 0.1)" : "rgba(12, 122, 122, 0.1)", color: user.role === "Developer" ? "#7C3AED" : "var(--primary)" }}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggleActive(user.id)} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenResetModal(user)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Restablecer Contraseña">
                          <Key className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenModal(user)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="p-2 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h3>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {error && (
                <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Nombre</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border outline-none text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 rounded-xl border outline-none text-sm" style={inputStyle} />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Contraseña</label>
                  <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full px-4 py-2 rounded-xl border outline-none text-sm" style={inputStyle} />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Rol</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 rounded-xl border outline-none text-sm" style={inputStyle}>
                  <option value="Administrador">Administrador</option>
                  <option value="Developer">Developer</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end bg-muted/30" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-muted" style={{ color: "var(--foreground)" }}>Cancelar</button>
              <button onClick={handleSave} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "var(--primary)" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsResetModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-card rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden border" style={{ borderColor: "var(--border)" }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h3 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>Restablecer Contraseña</h3>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl text-sm flex items-center gap-2" style={{ background: "#FEF2F2", color: "#DC2626" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>Nueva Contraseña</label>
                <input type="password" value={resetData.newPassword} onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })} className="w-full px-4 py-2 rounded-xl border outline-none text-sm" style={inputStyle} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex gap-3 justify-end bg-muted/30" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => setIsResetModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-muted" style={{ color: "var(--foreground)" }}>Cancelar</button>
              <button onClick={handleResetPassword} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "var(--primary)" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
