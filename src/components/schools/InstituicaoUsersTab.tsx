import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Eye, Pencil, Building, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getRoleDisplayName } from "@/lib/constants";
import UserForm from "@/components/users/UserForm";
import { cn } from "@/lib/utils";

const ROLE_ORDER = ["admin", "diretor", "coordenador", "professor", "tecadm", "aluno"];

interface MunicipioUser {
  id: string;
  name: string;
  email: string;
  registration?: string;
  role: string;
  city_id: string;
  created_at?: string;
}

interface MunicipioUsersResponse {
  municipio: { id: string; name: string; state: string };
  total: number;
  users: MunicipioUser[];
}

interface CityOption {
  id: string;
  name: string;
}

interface InstituicaoUsersTabProps {
  /** ID do município (obrigatório para tecadm; para admin pode vir do seletor) */
  cityId: string | null;
  /** Lista de cidades para o admin escolher (opcional) */
  cities?: CityOption[];
  /** Cidade selecionada no seletor (admin) */
  selectedCityId?: string;
  /** Callback quando admin altera a cidade */
  onCityChange?: (cityId: string) => void;
  /** Se o usuário atual é admin (pode editar qualquer um) */
  isAdmin?: boolean;
}

export function InstituicaoUsersTab({
  cityId,
  cities = [],
  selectedCityId,
  onCityChange,
  isAdmin = false,
}: InstituicaoUsersTabProps) {
  const [data, setData] = useState<MunicipioUsersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingUser, setViewingUser] = useState<MunicipioUser | null>(null);
  const [editingUser, setEditingUser] = useState<MunicipioUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    if (!cityId) return;
    setIsLoading(true);
    try {
      const res = await api.get<MunicipioUsersResponse>(`/city/${cityId}/users`);
      setData(res.data);
    } catch (err) {
      console.error("Erro ao carregar usuários do município:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários deste município.",
        variant: "destructive",
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [cityId, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleEditUser = async (userData: { id: number; name: string; email: string; role: string; registration?: string; city_id?: string }) => {
    setIsSaving(true);
    try {
      await api.put(`/users/${userData.id}`, userData);
      toast({ title: "Sucesso", description: "Usuário atualizado com sucesso." });
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Erro ao atualizar usuário:", err);
      toast({ title: "Erro", description: "Erro ao atualizar usuário.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const users = data?.users ?? [];
  const byRole = users.reduce<Record<string, MunicipioUser[]>>((acc, u) => {
    const r = u.role || "outro";
    if (!acc[r]) acc[r] = [];
    acc[r].push(u);
    return acc;
  }, {});

  const filteredByRole = searchQuery.trim()
    ? Object.fromEntries(
        Object.entries(byRole).map(([role, list]) => [
          role,
          list.filter(
            (u) =>
              u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (u.registration && u.registration.toLowerCase().includes(searchQuery.toLowerCase()))
          ),
        ]).filter(([, list]) => list.length > 0)
      )
    : byRole;

  const orderedRoles = [...ROLE_ORDER, ...Object.keys(filteredByRole).filter((r) => !ROLE_ORDER.includes(r))];
  const totalFiltered = Object.values(filteredByRole).reduce((s, arr) => s + arr.length, 0);

  const effectiveCityId = cityId || selectedCityId;
  const showCitySelector = isAdmin && cities.length > 0 && !cityId;

  return (
    <div className="space-y-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          Usuários do município agrupados por perfil. Use Ver para consultar dados e Editar para alterar.
        </p>
        {showCitySelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Município:</span>
            <Select
              value={selectedCityId || ""}
              onValueChange={(v) => v && onCityChange?.(v)}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione um município" />
              </SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!effectiveCityId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              {showCitySelector ? "Selecione um município acima para listar os usuários." : "Nenhum município definido."}
            </p>
          </CardContent>
        </Card>
      )}

      {effectiveCityId && (
        <>
          <div className="relative max-w-sm">
            <Input
              placeholder="Buscar por nome, e-mail ou matrícula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>

          {isLoading ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed bg-muted/30">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : totalFiltered === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery ? "Nenhum usuário encontrado para a busca." : "Nenhum usuário cadastrado neste município."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {data?.municipio && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{totalFiltered}</span> usuário(s) em{" "}
                  <span className="font-medium text-foreground">{data.municipio.name}</span> ({data.municipio.state})
                </p>
              )}
              {orderedRoles.map((role) => {
                const list = filteredByRole[role];
                if (!list?.length) return null;
                return (
                  <Card key={role} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-muted/50 border-b">
                      <h3 className="text-sm font-semibold text-[#7B3FE4] flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {getRoleDisplayName(role)}
                        <Badge variant="secondary" className="ml-1">{list.length}</Badge>
                      </h3>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                        {list.map((u) => (
                          <Card key={u.id} className={cn(
                            "overflow-hidden transition-all border-[#E5D5EA] dark:border-white/10",
                            "hover:border-[#7B3FE4]/40 hover:shadow-sm"
                          )}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground truncate">{u.name}</p>
                                  <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                                  {u.registration && (
                                    <p className="text-xs text-muted-foreground/80 mt-0.5">Matrícula: {u.registration}</p>
                                  )}
                                  <Badge variant="outline" className="mt-2 text-xs">
                                    {getRoleDisplayName(u.role)}
                                  </Badge>
                                </div>
                                <div className="flex flex-shrink-0 gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setViewingUser(u)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {(isAdmin || u.role !== "admin") && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setEditingUser(u)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Ver informações */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B3FE4]/10">
                <Users className="h-4 w-4 text-[#7B3FE4]" />
              </div>
              Informações do usuário
            </DialogTitle>
            <DialogDescription>Dados cadastrais</DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Nome completo</p>
                <p className="text-base font-medium text-foreground">{viewingUser.name}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">E-mail</p>
                <p className="text-base text-foreground">{viewingUser.email}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Matrícula</p>
                <p className="text-base text-foreground">{viewingUser.registration || "—"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Perfil</p>
                <p className="text-base text-foreground">{getRoleDisplayName(viewingUser.role)}</p>
              </div>
              {data?.municipio && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Município
                  </p>
                  <p className="text-base text-foreground">{data.municipio.name} ({data.municipio.state})</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Editar usuário */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>Altere os dados e salve.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <UserForm
              user={{
                id: Number(editingUser.id),
                name: editingUser.name,
                email: editingUser.email,
                role: editingUser.role,
                registration: editingUser.registration,
                city_id: editingUser.city_id,
              }}
              onSubmit={handleEditUser}
              showCitySelect={isAdmin}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
