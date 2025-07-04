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
import { Edit, Trash2, UserPlus, Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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

// Hierarquia de funções para ordenação por nível
const roleHierarchy: { [key: string]: number } = {
  "Administrador": 1,
  "Diretor": 2,
  "Coordenador": 3,
  "Professor": 4,
  "Técnico administrativo": 5,
  "Aluno": 6
};

// Tipos de ordenação
type SortField = 'name' | 'email' | 'role' | 'city' | 'id' | 'none';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
  secondary?: {
    field: SortField;
    direction: SortDirection;
  };
}

// Funções utilitárias para ordenação avançada
const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .trim();
};

const compareNatural = (a: string, b: string): number => {
  const aNum = parseFloat(a);
  const bNum = parseFloat(b);
  
  if (!isNaN(aNum) && !isNaN(bNum)) {
    return aNum - bNum;
  }
  
  return normalizeString(a).localeCompare(normalizeString(b), 'pt-BR', {
    numeric: true,
    sensitivity: 'base'
  });
};

const getSortValue = (user: User, field: SortField): string | number => {
  switch (field) {
    case 'name':
      return normalizeString(user.name);
    case 'email':
      return normalizeString(user.email);
    case 'role':
      return roleHierarchy[user.role] || 999;
    case 'city':
      return normalizeString(user.city_name || 'zzz'); // Valores vazios vão para o final
    case 'id':
      return user.id;
    default:
      return '';
  }
};

// Persistência da ordenação
const SORT_STORAGE_KEY = 'users-table-sort';

const saveSortConfig = (config: SortConfig) => {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('Não foi possível salvar configuração de ordenação:', error);
  }
};

const loadSortConfig = (): SortConfig => {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Não foi possível carregar configuração de ordenação:', error);
  }
  return { field: 'none', direction: 'asc' };
};

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
  
  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<SortConfig>(() => loadSortConfig());
  
  // Função de ordenação melhorada
  const handleSort = (field: SortField, setSecondary = false) => {
    setSortConfig(prev => {
      let newConfig: SortConfig;
      
      if (setSecondary && prev.field !== 'none') {
        // Definir ordenação secundária
        newConfig = {
          ...prev,
          secondary: {
            field,
            direction: 'asc'
          }
        };
      } else {
        // Ordenação principal
        if (prev.field === field) {
          // Alternar direção ou adicionar ordenação secundária
          if (prev.direction === 'asc') {
            newConfig = { ...prev, direction: 'desc' };
          } else if (!prev.secondary) {
            // Se não tem secundária, sugerir nome como secundária
            newConfig = {
              field,
              direction: 'asc',
              secondary: field !== 'name' ? { field: 'name', direction: 'asc' } : undefined
            };
          } else {
            // Reset
            newConfig = { field: 'none', direction: 'asc' };
          }
        } else {
          newConfig = {
            field,
            direction: 'asc',
            secondary: field !== 'name' ? { field: 'name', direction: 'asc' } : undefined
          };
        }
      }
      
      saveSortConfig(newConfig);
      return newConfig;
    });
  };

  // Função para ordenar usuários avançada
  const sortUsers = (users: User[], config: SortConfig): User[] => {
    if (config.field === 'none') return users;

    return [...users].sort((a, b) => {
      // Ordenação principal
      const aValue = getSortValue(a, config.field);
      const bValue = getSortValue(b, config.field);
      
      let result = 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        result = compareNatural(aValue, bValue);
      } else {
        result = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
      
      if (config.direction === 'desc') {
        result *= -1;
      }
      
      // Se valores são iguais e há ordenação secundária
      if (result === 0 && config.secondary) {
        const aSecondary = getSortValue(a, config.secondary.field);
        const bSecondary = getSortValue(b, config.secondary.field);
        
        if (typeof aSecondary === 'string' && typeof bSecondary === 'string') {
          result = compareNatural(aSecondary, bSecondary);
        } else {
          result = aSecondary < bSecondary ? -1 : aSecondary > bSecondary ? 1 : 0;
        }
        
        if (config.secondary.direction === 'desc') {
          result *= -1;
        }
      }
      
      return result;
    });
  };
  
  // Usuários filtrados e paginados
  const filteredUsers = useMemo(() => {
    if (users.length === 0) return [];

    // Primeiro filtrar
    const filtered = users.filter(user => {
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

    // Depois ordenar
    return sortUsers(filtered, sortConfig);
  }, [users, debouncedSearchTerm, filters, sortConfig]);

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

  const handleEditModalChange = (open: boolean) => {
    if (!open) {
      setCurrentUser(null);
    }
    setIsEditModalOpen(open);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const handleAddModalChange = (open: boolean) => {
    setIsAddModalOpen(open);
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
          
          <Dialog open={isAddModalOpen} onOpenChange={handleAddModalChange}>
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">Ordenar:</span>
            <Select 
              onValueChange={(value) => {
                if (value === 'none') {
                  setSortConfig({ field: 'none', direction: 'asc' });
                } else {
                  handleSort(value as SortField);
                }
              }} 
              value={sortConfig.field}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-3 w-3" />
                    Padrão
                  </div>
                </SelectItem>
                <SelectItem value="name">
                  <div className="flex items-center gap-2">
                    {sortConfig.field === 'name' ? (
                      sortConfig.direction === 'asc' ? 
                      <ArrowUp className="h-3 w-3" /> : 
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                    Nome (A-Z)
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    {sortConfig.field === 'email' ? (
                      sortConfig.direction === 'asc' ? 
                      <ArrowUp className="h-3 w-3" /> : 
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                    Email (A-Z)
                  </div>
                </SelectItem>
                <SelectItem value="role">
                  <div className="flex items-center gap-2">
                    {sortConfig.field === 'role' ? (
                      sortConfig.direction === 'asc' ? 
                      <ArrowUp className="h-3 w-3" /> : 
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                    Hierarquia
                  </div>
                </SelectItem>
                <SelectItem value="city">
                  <div className="flex items-center gap-2">
                    {sortConfig.field === 'city' ? (
                      sortConfig.direction === 'asc' ? 
                      <ArrowUp className="h-3 w-3" /> : 
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                    Município (A-Z)
                  </div>
                </SelectItem>
                <SelectItem value="id">
                  <div className="flex items-center gap-2">
                    {sortConfig.field === 'id' ? (
                      sortConfig.direction === 'asc' ? 
                      <ArrowUp className="h-3 w-3" /> : 
                      <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3" />
                    )}
                    ID (#)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={sortConfig.field === 'name' ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort('name')}
              className="h-9 px-2"
              title="Ordenar por Nome"
            >
              <div className="flex items-center gap-1">
                {sortConfig.field === 'name' ? (
                  sortConfig.direction === 'asc' ? 
                  <ArrowUp className="h-3 w-3" /> : 
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUpDown className="h-3 w-3" />
                )}
                <span className="text-xs">Nome</span>
              </div>
            </Button>
            
            <Button
              variant={sortConfig.field === 'role' ? "default" : "outline"}
              size="sm"
              onClick={() => handleSort('role')}
              className="h-9 px-2"
              title="Ordenar por Hierarquia"
            >
              <div className="flex items-center gap-1">
                {sortConfig.field === 'role' ? (
                  sortConfig.direction === 'asc' ? 
                  <ArrowUp className="h-3 w-3" /> : 
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUpDown className="h-3 w-3" />
                )}
                <span className="text-xs">Função</span>
              </div>
            </Button>
          </div>

          {sortConfig.field !== 'none' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const newConfig = { field: 'none' as SortField, direction: 'asc' as SortDirection };
                setSortConfig(newConfig);
                saveSortConfig(newConfig);
              }}
              className="h-9 px-2 text-muted-foreground hover:text-foreground"
              title="Remover ordenação"
            >
              <div className="flex items-center gap-1">
                <ArrowUpDown className="h-3 w-3" />
                <span className="text-xs">Reset</span>
              </div>
            </Button>
          )}

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
          {sortConfig.field !== 'none' && (
            <div className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
              {sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              <span>
                Ordenado por{' '}
                {sortConfig.field === 'name' && 'Nome'}
                {sortConfig.field === 'email' && 'Email'}
                {sortConfig.field === 'role' && 'Hierarquia'}
                {sortConfig.field === 'city' && 'Município'}
                {sortConfig.field === 'id' && 'ID'}
                {sortConfig.secondary && (
                  <>
                    {' + '}
                    {sortConfig.secondary.field === 'name' && 'Nome'}
                    {sortConfig.secondary.field === 'email' && 'Email'}
                    {sortConfig.secondary.field === 'role' && 'Hierarquia'}
                    {sortConfig.secondary.field === 'city' && 'Município'}
                    {sortConfig.secondary.field === 'id' && 'ID'}
                  </>
                )}
              </span>
            </div>
          )}
          {filteredUsers.length > 100 && sortConfig.field !== 'none' && (
            <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              <span>⚡ Ordenação inteligente ativa</span>
            </div>
          )}
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
                <TableHead>
                  <div className="flex items-center gap-2">
                    Nome
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  </div>
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Função
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Município
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  </div>
                </TableHead>
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
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nome
                      {sortConfig.field === 'name' ? (
                        sortConfig.direction === 'asc' ? 
                        <ArrowUp className="h-3 w-3" /> : 
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {sortConfig.field === 'email' ? (
                        sortConfig.direction === 'asc' ? 
                        <ArrowUp className="h-3 w-3" /> : 
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-2">
                      Função
                      {sortConfig.field === 'role' ? (
                        sortConfig.direction === 'asc' ? 
                        <ArrowUp className="h-3 w-3" /> : 
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('city')}
                  >
                    <div className="flex items-center gap-2">
                      Município
                      {sortConfig.field === 'city' ? (
                        sortConfig.direction === 'asc' ? 
                        <ArrowUp className="h-3 w-3" /> : 
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </div>
                  </TableHead>
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
      <Dialog open={isEditModalOpen} onOpenChange={handleEditModalChange}>
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