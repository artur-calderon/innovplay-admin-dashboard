import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Users, MapPin, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRoleDisplayName } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { formatSlugForHost } from "@/lib/subdomain";

export interface CityDomain {
  id: string;
  name: string;
  state: string;
  slug: string;
  dominio: string;
  url: string;
}

interface MunicipioUsersResponse {
  municipio: { id: string; name: string; state: string };
  total: number;
  users: Array<{
    id: string;
    name: string;
    email: string;
    registration?: string;
    role: string;
    city_id: string;
    created_at: string;
  }>;
}

const ROLE_ORDER = ["admin", "diretor", "coordenador", "professor", "tecadm", "aluno"];

export default function Domains() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<CityDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<CityDomain | null>(null);
  const [usersData, setUsersData] = useState<MunicipioUsersResponse | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const { toast } = useToast();

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const openDetailsModal = (domain: CityDomain) => {
    setSelectedDomain(domain);
    setModalOpen(true);
    setUsersData(null);
  };

  useEffect(() => {
    if (!modalOpen || !selectedDomain) return;
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await api.get<MunicipioUsersResponse>(
          `/city/${selectedDomain.id}/users`
        );
        setUsersData(response.data);
      } catch (error) {
        console.error("Erro ao carregar usuários do município:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os usuários deste município.",
          variant: "destructive",
        });
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, [modalOpen, selectedDomain?.id, toast]);

  useEffect(() => {
    const fetchDomains = async () => {
      setIsLoading(true);
      try {
        const response = await api.get<CityDomain[]>("/city/domains");
        setDomains(response.data ?? []);
      } catch (error) {
        console.error("Erro ao carregar domínios:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar domínios do sistema",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDomains();
  }, [toast]);

  const filteredDomains = domains.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.state?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.dominio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header card */}
        <Card className="border-[#E5D5EA] shadow-sm dark:border-white/10">
          <CardHeader className="pb-4 sm:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7B3FE4]/10">
                    <Globe className="h-5 w-5 text-[#7B3FE4]" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">Domínios do sistema</CardTitle>
                </div>
                <CardDescription className="mt-1.5">
                  Municípios cadastrados na plataforma. Clique no domínio para acessar ou em Ver mais para listar usuários.
                </CardDescription>
              </div>
              {!isLoading && filteredDomains.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#7B3FE4]/10 px-3 py-1 text-sm font-medium text-[#7B3FE4]">
                  {filteredDomains.length} domínio(s)
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Buscar por município, estado ou domínio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md"
            />

            {isLoading ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-[#E5D5EA] dark:border-white/10 bg-muted/30">
                <Loader2 className="h-10 w-10 animate-spin text-[#7B3FE4]" />
              </div>
            ) : filteredDomains.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E5D5EA] dark:border-white/10 bg-muted/20 px-4 text-center">
                <Globe className="mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery ? "Nenhum domínio encontrado para a busca." : "Nenhum domínio cadastrado."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredDomains.map((d) => (
                  <Card
                    key={d.id}
                    className={cn(
                      "group overflow-hidden transition-all duration-200",
                      "border-[#E5D5EA] hover:border-[#7B3FE4]/40 hover:shadow-md dark:border-white/10 dark:hover:border-[#7B3FE4]/40"
                    )}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold text-foreground">{d.name}</h3>
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {d.state}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border border-[#E5D5EA] dark:border-white/10",
                              "bg-muted/30 px-3 py-2 text-sm font-mono text-[#7B3FE4] w-full",
                              "transition-colors hover:bg-[#7B3FE4]/10 hover:border-[#7B3FE4]/30"
                            )}
                          >
                            <span className="truncate">{d.dominio}</span>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 ml-auto" />
                          </a>
                          <a
                            href={`http://${formatSlugForHost(d.slug)}.localhost:8080`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg border border-[#E5D5EA] dark:border-white/10",
                              "bg-muted/20 px-3 py-2 text-xs font-mono text-muted-foreground w-full",
                              "transition-colors hover:bg-muted/40 hover:text-foreground"
                            )}
                          >
                            <span className="truncate">{formatSlugForHost(d.slug)}.localhost:8080</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 ml-auto" />
                          </a>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailsModal(d)}
                          className="mt-1 w-full gap-2 border-[#E5D5EA] dark:border-white/10"
                        >
                          <Users className="h-4 w-4" />
                          Ver usuários
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-hidden flex flex-col p-0 sm:rounded-lg">
          <DialogHeader className="shrink-0 border-b border-[#E5D5EA] px-4 py-4 dark:border-white/10 sm:px-6">
            <DialogTitle className="flex flex-wrap items-center gap-2 text-left">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7B3FE4]/10">
                <Users className="h-4 w-4 text-[#7B3FE4]" />
              </div>
              <span>Usuários do município</span>
              {selectedDomain && (
                <span className="font-normal text-muted-foreground">
                  — {selectedDomain.name} ({selectedDomain.state})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            {usersLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#7B3FE4]" />
              </div>
            ) : usersData ? (
              <div className="space-y-6">
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{usersData.total}</span> usuário(s)
                </p>
                {(() => {
                  const byRole = usersData.users.reduce<Record<string, typeof usersData.users>>(
                    (acc, u) => {
                      const r = u.role || "outro";
                      if (!acc[r]) acc[r] = [];
                      acc[r].push(u);
                      return acc;
                    },
                    {}
                  );
                  const orderedRoles = [...ROLE_ORDER, ...Object.keys(byRole).filter((r) => !ROLE_ORDER.includes(r))];
                  return (
                    <div className="space-y-5">
                      {orderedRoles.map((role) => {
                        const list = byRole[role];
                        if (!list?.length) return null;
                        return (
                          <Card key={role} className="overflow-hidden border-[#E5D5EA] dark:border-white/10">
                            <div className="bg-[#7B3FE4]/5 px-3 py-2 dark:bg-[#7B3FE4]/10">
                              <h4 className="text-sm font-semibold text-[#7B3FE4]">
                                {getRoleDisplayName(role)}
                              </h4>
                            </div>
                            <CardContent className="p-0">
                              <ul className="divide-y divide-[#E5D5EA] dark:divide-white/10">
                                {list.map((u) => (
                                  <li
                                    key={u.id}
                                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2.5 text-sm"
                                  >
                                    <span className="font-medium text-foreground">{u.name}</span>
                                    <span className="text-muted-foreground">{u.email}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum dado carregado.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
