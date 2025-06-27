import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Trash2, UserPlus, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import UserForm from "./UserForm";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useDataContext } from "@/context/dataContext";

// Role mapping for display
const roleDisplayMapping: { [key: string]: string } = {
  "admin": "Administrador",
  "professor": "Professor",
  "coordenador": "Coordenador",
  "diretor": "Diretor",
  "tecadmin": "Técnico administrativo",
  "aluno": "Aluno"
};

const ROLES = ['Administrador', 'Professor', 'Coordenador', 'Diretor', 'Técnico administrativo', 'Aluno'];
const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];

// Hook para debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  registration?: string;
  city_id?: string;
  city_name?: string;
};

interface Filters {
  role: string;
  city: string;
}

export default function UsersTable() {
  const { municipios, getMunicipios } = useDataContext();
  
  // Estados principais
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de modais
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  
  // Estados de filtros e pesquisa
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<Filters>({
    role: 'all',
    city: 'all'
  });
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  
  // Estados de seleção múltipla
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Usuários filtrados e paginados
  const filteredUsers = useMemo(() => {
    if (users.length === 0) return [];

    return users.filter(user => {
      // Filtro de pesquisa
      if (debouncedSearchTerm !== '' && 
          !user.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
          !user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) &&
          !user.id.toString().includes(debouncedSearchTerm)) {
        return false;
      }

      // Filtro de função
      if (filters.role !== 'all' && user.role !== filters.role) {
        return false;
      }

      // Filtro de cidade
      if (filters.city !== 'all' && user.city_id !== filters.city) {
        return false;
      }

      return true;
    });
  }, [users, debouncedSearchTerm, filters]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Fetch municipios
  useEffect(() => {
    getMunicipios();
  }, [getMunicipios]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, filters]);

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get('/users/list');
      
      // Get users from response data
      const usersData = response.data?.users || [];
      
      // Transform the roles to display format (city names will be added separately)
      const formattedUsers = usersData.map((user: User) => ({
        ...user,
        role: roleDisplayMapping[user.role] || user.role,
        city_name: '' // Will be populated by separate effect
      }));
      
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Erro ao carregar usuários');
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies to prevent infinite loops

  // Load users only once on mount
  useEffect(() => {
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Update city names when municipios data is available
  useEffect(() => {
    if (Array.isArray(municipios) && municipios.length > 0 && users.length > 0) {
      setUsers(prevUsers => 
        prevUsers.map(user => ({
          ...user,
          city_name: municipios.find(m => m.id.toString() === user.city_id)?.name || ''
        }))
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipios]); // Update city names when municipios change

  // Event handlers
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedUsers.map(user => user.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds(prev =>
      checked ? [...prev, id] : prev.filter(selectedId => selectedId !== id)
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      await Promise.all(selectedIds.map(id => api.delete(`/users/${id}`)));
      toast.success(`${selectedIds.length} usuários excluídos com sucesso!`);
      setSelectedIds([]);
      // Refresh the list after delete
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting users:', error);
      toast.error('Erro ao excluir usuários');
    }
  };

  const handleAddUser = async (userData: Omit<User, "id"> & { password?: string }) => {
    try {
      const response = await api.post('/admin/criar-usuario', {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        registration: userData.registration,
        city_id: userData.city_id
      });

      if (response.status === 200 || response.status === 201) {
        toast.success('Usuário criado com sucesso!');
        closeAddModal();
        // Refresh the list after adding
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Erro ao criar usuário. Por favor, tente novamente.');
    }
  };

  const handleEditUser = async (userData: User) => {
    try {
      await api.put(`/users/${userData.id}`, userData);
      toast.success('Usuário atualizado com sucesso!');
      closeEditModal();
      // Refresh the list after editing
      await fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const openEditModal = (user: User) => {
    setCurrentUser(user);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setCurrentUser(null);
    setIsEditModalOpen(false);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const closeDeleteDialog = () => {
    setUserToDelete(null);
    setDeleteDialogOpen(false);
  };

  const confirmDelete = (userId: number) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      try {
        await api.delete(`/users/${userToDelete}`);
        toast.success('Usuário excluído com sucesso!');
        closeDeleteDialog();
        // Refresh the list after delete
        await fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.error('Erro ao excluir usuário');
      }
    }
  };

  // Renderização da paginação
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-1 py-3 border-t bg-muted/20">
        <div className="text-sm text-muted-foreground">
          Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredUsers.length)} de {filteredUsers.length}
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>

          {pages.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page)}
              className="h-8 w-8 p-0 text-xs"
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  // Componente de filtros
  const FiltersContent = () => (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium mb-1 block">Função</label>
        <Select onValueChange={(value) => handleFilterChange('role', value)} value={filters.role}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todas as Funções" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Funções</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Município</label>
        <Select onValueChange={(value) => handleFilterChange('city', value)} value={filters.city}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos os Municípios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Municípios</SelectItem>
            {Array.isArray(municipios) && municipios.map((city) => (
              <SelectItem key={city.id} value={city.id.toString()}>{city.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Usuários</h1>
          {error && (
            <Badge variant="destructive" className="text-xs">
              Erro de Conexão
            </Badge>
          )}
          {isLoading && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-current animate-bounce"></div>
                Carregando...
              </div>
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir ({selectedIds.length})
            </Button>
          )}
          
          <Dialog open={isAddModalOpen} onOpenChange={closeAddModal}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
              </DialogHeader>
              <UserForm onSubmit={handleAddUser} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 bg-muted/30 p-3 rounded-lg">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Pesquisar por nome, email ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">Por página:</span>
            <Select onValueChange={(value) => setPageSize(Number(value))} value={pageSize.toString()}>
              <SelectTrigger className="w-16 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FiltersContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{filteredUsers.length} usuário(s) encontrado(s)</span>
          {searchTerm !== debouncedSearchTerm && (
            <div className="flex items-center gap-1 text-xs">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span className="animate-pulse">Buscando...</span>
            </div>
          )}
        </div>
        {paginatedUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={paginatedUsers.length > 0 && selectedIds.length === paginatedUsers.length}
              onCheckedChange={handleSelectAll}
              aria-label="Selecionar todos da página"
            />
            <span>Selecionar todos da página</span>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="border rounded-lg overflow-hidden bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Município</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index} className="border-b">
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : error ? (
        <div className="border rounded-lg p-12 text-center bg-background">
          <div className="space-y-4">
            <div className="text-destructive">
              <p className="text-lg font-semibold">Erro ao carregar usuários</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
            <Button onClick={() => fetchUsers()} size="sm">
              Tentar Novamente
            </Button>
          </div>
        </div>
      ) : paginatedUsers.length > 0 ? (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={paginatedUsers.length > 0 && selectedIds.length === paginatedUsers.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id} className="border-b hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectOne(user.id, !!checked)}
                        aria-label={`Selecionar ${user.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.city_name || 'Não informado'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(user)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => confirmDelete(user.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {renderPagination()}
        </div>
      ) : (
        <div className="border rounded-lg p-12 text-center text-muted-foreground bg-background">
          <div className="space-y-2">
            <p className="text-lg">Nenhum usuário encontrado</p>
            <p className="text-sm">Tente ajustar seus filtros ou termos de pesquisa</p>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {currentUser && <UserForm user={currentUser} onSubmit={handleEditUser} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}