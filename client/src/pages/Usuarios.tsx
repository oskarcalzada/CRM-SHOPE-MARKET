import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { NotificationContext } from '@/App';
import { Plus, Edit, Trash2, Shield, Users as UsersIcon, Eye, EyeOff } from 'lucide-react';

interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'admin' | 'manager' | 'employee' | 'readonly';
  isActive: boolean;
  createdAt: string;
}

export default function Usuarios() {
  const { user, hasPermission } = useAuth();
  const { showNotification } = React.useContext(NotificationContext);
  
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  
  const [filtros, setFiltros] = React.useState({
    nombre: '',
    rol: 'all',
    estado: 'all'
  });

  const [formData, setFormData] = React.useState<{
    username: string;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'manager' | 'employee' | 'readonly';
    isActive: boolean;
  }>({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'employee',
    isActive: true
  });

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Load users from API
  const loadUsers = async () => {
    if (!hasPermission('usuarios', 'read')) return;
    
    try {
      setLoading(true);
      console.log('📦 Boxito: Loading users...');
      
      const response = await fetch('/api/users', {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        console.log(`📦 Boxito: Loaded ${data.length} users`);
      } else {
        showNotification('Error al cargar usuarios', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error loading users:', error);
      showNotification('Error de conexión al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadUsers();
  }, [hasPermission]);

  // Auto-generate username from name
  React.useEffect(() => {
    if (formData.name && !editingUser) {
      const username = formData.name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      
      setFormData(prev => ({ ...prev, username }));
    }
  }, [formData.name, editingUser]);

  const resetForm = () => {
    setFormData({
      username: '',
      name: '',
      email: '',
      password: '',
      role: 'employee',
      isActive: true
    });
    setEditingUser(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isUpdate = !!editingUser;
    const requiredPermission = isUpdate ? 'usuarios:update' : 'usuarios:create';
    
    if (!hasPermission('usuarios', isUpdate ? 'update' : 'create')) {
      showNotification('No tienes permisos para esta acción', 'error');
      return;
    }

    // Validate password for new users
    if (!isUpdate && (!formData.password || formData.password.length < 6)) {
      showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    try {
      setLoading(true);
      console.log('📦 Boxito: Saving user...', { isUpdate, userId: editingUser?.id });
      
      const userData = {
        username: formData.username,
        name: formData.name,
        email: formData.email || undefined,
        role: formData.role,
        isActive: formData.isActive,
        ...((!isUpdate || formData.password) && { password: formData.password })
      };
      
      const url = isUpdate ? `/api/users/${editingUser!.id}` : '/api/users';
      const method = isUpdate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        showNotification(
          `📦 Usuario ${isUpdate ? 'actualizado' : 'creado'} exitosamente`, 
          'success'
        );
        
        resetForm();
        setDialogOpen(false);
        await loadUsers();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || `Error al ${isUpdate ? 'actualizar' : 'crear'} usuario`, 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error saving user:', error);
      showNotification(`Error de conexión al ${isUpdate ? 'actualizar' : 'crear'} usuario`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      name: user.name,
      email: user.email || '',
      password: '', // Leave empty for updates
      role: user.role,
      isActive: user.isActive
    });
    setDialogOpen(true);
  };

  const handleDelete = async (user: User) => {
    if (!hasPermission('usuarios', 'delete')) {
      showNotification('No tienes permisos para eliminar usuarios', 'error');
      return;
    }

    if (user.username === 'admin') {
      showNotification('No se puede eliminar el usuario administrador', 'error');
      return;
    }

    if (!confirm(`📦 Boxito pregunta: ¿Confirmas que quieres eliminar al usuario ${user.name}?`)) {
      return;
    }

    try {
      setLoading(true);
      console.log('📦 Boxito: Deleting user:', user.id);
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        showNotification(`📦 Usuario ${user.name} eliminado exitosamente`, 'success');
        await loadUsers();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Error al eliminar usuario', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error deleting user:', error);
      showNotification('Error de conexión al eliminar usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    if (!hasPermission('usuarios', 'update')) {
      showNotification('No tienes permisos para cambiar estado de usuarios', 'error');
      return;
    }

    if (user.username === 'admin') {
      showNotification('No se puede desactivar el usuario administrador', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...user,
          isActive: !user.isActive
        })
      });
      
      if (response.ok) {
        showNotification(
          `📦 Usuario ${user.isActive ? 'desactivado' : 'activado'} correctamente`, 
          'success'
        );
        await loadUsers();
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Error al cambiar estado', 'error');
      }
    } catch (error) {
      console.error('📦 Boxito: Error toggling user status:', error);
      showNotification('Error de conexión al cambiar estado', 'error');
    }
  };

  const usuariosFiltrados = users.filter(user => {
    const cumpleNombre = !filtros.nombre || 
      user.name.toLowerCase().includes(filtros.nombre.toLowerCase()) ||
      user.username.toLowerCase().includes(filtros.nombre.toLowerCase());
    const cumpleRol = filtros.rol === 'all' || user.role === filtros.rol;
    const cumpleEstado = filtros.estado === 'all' || 
      (filtros.estado === 'active' ? user.isActive : !user.isActive);
    
    return cumpleNombre && cumpleRol && cumpleEstado;
  });

  const getRoleBadge = (role: User['role']) => {
    const roleColors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      employee: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      readonly: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };

    const roleNames = {
      admin: 'Administrador',
      manager: 'Gerente',
      employee: 'Empleado',
      readonly: 'Solo Lectura'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role]}`}>
        {roleNames[role]}
      </span>
    );
  };

  const getPermissionsCount = (role: User['role']) => {
    const permissionCounts = {
      admin: 50,
      manager: 35,
      employee: 20,
      readonly: 10
    };
    return permissionCounts[role];
  };

  if (!hasPermission('usuarios', 'read')) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Acceso Denegado</h3>
          <p className="text-gray-600 dark:text-gray-400">No tienes permisos para ver esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        
        {hasPermission('usuarios', 'create') && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-shope-primary" onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Nombre Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Juan Pérez González"
                    />
                  </div>

                  <div>
                    <Label htmlFor="username">Usuario *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      required
                      disabled={!!editingUser}
                      placeholder="Se genera automáticamente del nombre"
                    />
                    {!editingUser && formData.name && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Generado automáticamente: {formData.username}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email (Opcional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="juan@shopeenvios.com"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">
                      Contraseña {editingUser ? '(Dejar vacío para no cambiar)' : '*'}
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        required={!editingUser}
                        placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña (mín. 6 caracteres)'}
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="role">Rol *</Label>
                    <Select value={formData.role} onValueChange={(value: User['role']) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="employee">Empleado</SelectItem>
                        <SelectItem value="readonly">Solo Lectura</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.role && `${getPermissionsCount(formData.role)} permisos asignados`}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Usuario activo</Label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setDialogOpen(false);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading 
                      ? 'Procesando...' 
                      : (editingUser ? 'Actualizar' : 'Crear') + ' Usuario'
                    }
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Filtros
          </CardTitle>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <Label htmlFor="filtroNombre">Buscar Usuario</Label>
              <Input
                id="filtroNombre"
                placeholder="Nombre o usuario..."
                value={filtros.nombre}
                onChange={(e) => setFiltros(prev => ({ ...prev, nombre: e.target.value }))}
                className="input-shope"
              />
            </div>
            
            <div>
              <Label htmlFor="filtroRol">Rol</Label>
              <Select value={filtros.rol} onValueChange={(value) => setFiltros(prev => ({ ...prev, rol: value }))}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos los roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="manager">Gerente</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                  <SelectItem value="readonly">Solo Lectura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filtroEstado">Estado</Label>
              <Select value={filtros.estado} onValueChange={(value) => setFiltros(prev => ({ ...prev, estado: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Usuarios */}
      <Card className="card-shope">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            Usuarios del Sistema ({usuariosFiltrados.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="text-white font-bold">👥</span>
              </div>
              <p className="text-gray-600">Cargando usuarios...</p>
            </div>
          ) : (
            <div className="table-shope">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-blue-600 to-blue-700">
                    <TableHead className="text-white font-semibold">Usuario</TableHead>
                    <TableHead className="text-white font-semibold">Nombre</TableHead>
                    <TableHead className="text-white font-semibold">Email</TableHead>
                    <TableHead className="text-white font-semibold">Rol</TableHead>
                    <TableHead className="text-white font-semibold">Permisos</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-white font-semibold">Fecha Creación</TableHead>
                    <TableHead className="text-white font-semibold">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        📦 No se encontraron usuarios
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuariosFiltrados.map((user) => (
                      <TableRow key={user.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email || '--'}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-blue-600 font-medium">
                            {getPermissionsCount(user.role)} permisos
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={user.isActive}
                              onCheckedChange={() => toggleUserStatus(user)}
                              disabled={user.username === 'admin' || !hasPermission('usuarios', 'update')}
                            />
                            <span className={`text-sm ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                              {user.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.createdAt).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {hasPermission('usuarios', 'update') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(user)}
                                className="hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}
                            
                            {hasPermission('usuarios', 'delete') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(user)}
                                disabled={user.username === 'admin'}
                                className="hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de Roles y Permisos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-shope">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {users.filter(u => u.role === 'admin').length}
              </div>
              <div className="text-sm text-gray-600">Administradores</div>
              <div className="text-xs text-gray-500 mt-1">Control total</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shope">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {users.filter(u => u.role === 'manager').length}
              </div>
              <div className="text-sm text-gray-600">Gerentes</div>
              <div className="text-xs text-gray-500 mt-1">Gestión avanzada</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shope">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {users.filter(u => u.role === 'employee').length}
              </div>
              <div className="text-sm text-gray-600">Empleados</div>
              <div className="text-xs text-gray-500 mt-1">Operaciones básicas</div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-shope">
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600 mb-2">
                {users.filter(u => u.role === 'readonly').length}
              </div>
              <div className="text-sm text-gray-600">Solo Lectura</div>
              <div className="text-xs text-gray-500 mt-1">Consulta únicamente</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}