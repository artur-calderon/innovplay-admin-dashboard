import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, AlertCircle, Info, Globe, Building2, School, Check, ChevronsUpDown, Users, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CreateAvisoDTO, AvisoDestinatarios } from '@/types/avisos';
import { canSendToAll, canSelectMunicipality, canSelectSchool, getScopeDescription } from '@/utils/avisosPermissions';

interface CreateAvisoFormProps {
  userRole: string;
  userId: string;
  userMunicipioId?: string;
  userEscolaId?: string;
  onSuccess: () => void;
}

interface Municipality {
  id: string;
  name: string;
  state: string;
}

interface School {
  id: string;
  name: string;
  nome?: string;
  city_id: string;
}

export function CreateAvisoForm({ 
  userRole, 
  userId, 
  userMunicipioId,
  userEscolaId,
  onSuccess 
}: CreateAvisoFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState(false);
  const [isLoadingSchools, setIsLoadingSchools] = useState(false);

  // Estados do formulário
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [destinatarioTipo, setDestinatarioTipo] = useState<'todos' | 'municipio' | 'escola'>('todos');
  const [selectedMunicipioId, setSelectedMunicipioId] = useState<string>('');
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>('');

  // Estados dos popovers (combobox)
  const [openMunicipioCombo, setOpenMunicipioCombo] = useState(false);
  const [openEscolaCombo, setOpenEscolaCombo] = useState(false);

  // Listas de opções
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<School[]>([]);

  // Permissões do usuário
  const permissions = {
    canSendToAll: canSendToAll(userRole),
    canSelectMunicipality: canSelectMunicipality(userRole),
    canSelectSchool: canSelectSchool(userRole),
  };

  // Carregar municípios (apenas para admin)
  useEffect(() => {
    if (permissions.canSelectMunicipality) {
      loadMunicipalities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions.canSelectMunicipality]);

  // Carregar escolas
  useEffect(() => {
    loadSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filtrar escolas baseado no município selecionado ou role do usuário
  useEffect(() => {
    if (userRole === 'admin') {
      // Admin vê todas as escolas, mas com informação do município
      if (destinatarioTipo === 'escola' && selectedMunicipioId) {
        // Se município selecionado, filtrar por ele
        const filtered = schools.filter(school => school.city_id === selectedMunicipioId);
        setFilteredSchools(filtered);
      } else {
        // Mostrar todas as escolas
        setFilteredSchools(schools);
      }
    } else if (userRole === 'tecadm' && userMunicipioId) {
      // TecAdm vê apenas escolas do seu município
      const filtered = schools.filter(school => school.city_id === userMunicipioId);
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [selectedMunicipioId, schools, userRole, userMunicipioId, destinatarioTipo]);

  // Definir valores padrão baseado na role
  useEffect(() => {
    if (userRole === 'diretor') {
      setDestinatarioTipo('escola');
      setSelectedEscolaId(userEscolaId || '');
    } else if (userRole === 'tecadm') {
      setDestinatarioTipo('municipio');
      setSelectedMunicipioId(userMunicipioId || '');
    }
  }, [userRole, userEscolaId, userMunicipioId]);

  const loadMunicipalities = async () => {
    setIsLoadingMunicipalities(true);
    try {
      const response = await api.get('/city/');
      setMunicipalities(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar municípios:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de municípios',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMunicipalities(false);
    }
  };

  const loadSchools = async () => {
    setIsLoadingSchools(true);
    try {
      const response = await api.get('/school/');
      const schoolsData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      setSchools(schoolsData);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a lista de escolas',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingSchools(false);
    }
  };

  const validateForm = (): boolean => {
    if (!titulo.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'O título do aviso é obrigatório',
        variant: 'destructive',
      });
      return false;
    }

    if (!mensagem.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'A mensagem do aviso é obrigatória',
        variant: 'destructive',
      });
      return false;
    }

    if (destinatarioTipo === 'municipio' && !selectedMunicipioId) {
      toast({
        title: 'Erro de validação',
        description: 'Selecione um município para enviar o aviso',
        variant: 'destructive',
      });
      return false;
    }

    if (destinatarioTipo === 'escola') {
      // Para admin, município é obrigatório ao selecionar escola
      if (userRole === 'admin' && !selectedMunicipioId) {
        toast({
          title: 'Erro de validação',
          description: 'Selecione um município antes de escolher a escola',
          variant: 'destructive',
        });
        return false;
      }

      if (!selectedEscolaId) {
        toast({
          title: 'Erro de validação',
          description: 'Selecione uma escola para enviar o aviso',
          variant: 'destructive',
        });
        return false;
      }
    }

    return true;
  };

  // Dados calculados para preview
  const selectedMunicipio = useMemo(() => {
    return municipalities.find(m => m.id === selectedMunicipioId);
  }, [municipalities, selectedMunicipioId]);

  const selectedEscola = useMemo(() => {
    return schools.find(s => s.id === selectedEscolaId);
  }, [schools, selectedEscolaId]);

  const escolaMunicipio = useMemo(() => {
    if (selectedEscola) {
      return municipalities.find(m => m.id === selectedEscola.city_id);
    }
    return null;
  }, [selectedEscola, municipalities]);

  // Estatísticas para preview
  const previewStats = useMemo(() => {
    if (destinatarioTipo === 'todos') {
      return {
        alcance: 'Global',
        descricao: 'Todos os usuários do sistema',
        icon: Globe,
      };
    } else if (destinatarioTipo === 'municipio' && selectedMunicipio) {
      const escolasDoMunicipio = schools.filter(s => s.city_id === selectedMunicipioId).length;
      return {
        alcance: selectedMunicipio.name,
        descricao: `${escolasDoMunicipio} escola${escolasDoMunicipio !== 1 ? 's' : ''} no município`,
        icon: Building2,
      };
    } else if (destinatarioTipo === 'escola' && selectedEscola) {
      return {
        alcance: selectedEscola.name || selectedEscola.nome || 'Escola',
        descricao: escolaMunicipio ? `${escolaMunicipio.name} - ${escolaMunicipio.state}` : 'Município não identificado',
        icon: School,
      };
    }
    return null;
  }, [destinatarioTipo, selectedMunicipio, selectedEscola, escolaMunicipio, schools, selectedMunicipioId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Montar estrutura de destinatários
      const destinatarios: AvisoDestinatarios = {
        tipo: destinatarioTipo,
      };

      if (destinatarioTipo === 'municipio') {
        destinatarios.municipio_id = selectedMunicipioId;
        destinatarios.municipio_nome = selectedMunicipio?.name || '';
      } else if (destinatarioTipo === 'escola') {
        destinatarios.escola_id = selectedEscolaId;
        destinatarios.escola_nome = selectedEscola?.name || selectedEscola?.nome || '';
      }

      const avisoData: CreateAvisoDTO = {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        destinatarios,
      };

      // TODO: Integrar com API quando disponível
      // const response = await createAviso(avisoData);
      
      console.log('Aviso a ser criado:', avisoData);

      toast({
        title: 'Aviso criado com sucesso!',
        description: 'O aviso foi publicado e está visível para os destinatários.',
      });

      // Limpar formulário
      setTitulo('');
      setMensagem('');
      setDestinatarioTipo(userRole === 'diretor' ? 'escola' : 'todos');
      setSelectedMunicipioId('');
      setSelectedEscolaId('');

      // Callback de sucesso
      onSuccess();
    } catch (error) {
      console.error('Erro ao criar aviso:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o aviso. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Criar Novo Aviso
        </CardTitle>
        <CardDescription>
          {getScopeDescription(userRole)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">
              Título do Aviso <span className="text-red-500">*</span>
            </Label>
            <Input
              id="titulo"
              placeholder="Ex: Início do período de avaliações"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500">
              {titulo.length}/100 caracteres
            </p>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="mensagem">
              Mensagem <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="mensagem"
              placeholder="Digite a mensagem completa do aviso..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={6}
              maxLength={1000}
              required
            />
            <p className="text-xs text-gray-500">
              {mensagem.length}/1000 caracteres
            </p>
          </div>

          {/* Destinatários */}
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <Label className="text-base font-semibold">Destinatários</Label>

            {/* Admin - pode escolher entre todos, município ou escola */}
            {userRole === 'admin' && (
              <RadioGroup 
                value={destinatarioTipo} 
                onValueChange={(value: 'todos' | 'municipio' | 'escola') => setDestinatarioTipo(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="todos" id="todos" />
                  <Label htmlFor="todos" className="flex items-center gap-2 cursor-pointer font-normal">
                    <Globe className="w-4 h-4" />
                    Todos os usuários
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="municipio" id="municipio" />
                  <Label htmlFor="municipio" className="flex items-center gap-2 cursor-pointer font-normal">
                    <Building2 className="w-4 h-4" />
                    Município específico
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="escola" id="escola" />
                  <Label htmlFor="escola" className="flex items-center gap-2 cursor-pointer font-normal">
                    <School className="w-4 h-4" />
                    Escola específica
                  </Label>
                </div>
              </RadioGroup>
            )}

            {/* Tec Adm - pode escolher entre município ou escola */}
            {userRole === 'tecadm' && (
              <RadioGroup 
                value={destinatarioTipo} 
                onValueChange={(value: 'municipio' | 'escola') => setDestinatarioTipo(value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="municipio" id="municipio" />
                  <Label htmlFor="municipio" className="flex items-center gap-2 cursor-pointer font-normal">
                    <Building2 className="w-4 h-4" />
                    Todo o município
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="escola" id="escola" />
                  <Label htmlFor="escola" className="flex items-center gap-2 cursor-pointer font-normal">
                    <School className="w-4 h-4" />
                    Escola específica
                  </Label>
                </div>
              </RadioGroup>
            )}

            {/* Diretor - apenas sua escola */}
            {userRole === 'diretor' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Este aviso será enviado automaticamente para sua escola.
                </AlertDescription>
              </Alert>
            )}

            {/* Combobox de Município (apenas admin) */}
            {destinatarioTipo === 'municipio' && permissions.canSelectMunicipality && (
              <div className="space-y-2 mt-4">
                <Label htmlFor="select-municipio">
                  Selecione o Município <span className="text-red-500">*</span>
                </Label>
                <Popover open={openMunicipioCombo} onOpenChange={setOpenMunicipioCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openMunicipioCombo}
                      className="w-full justify-between"
                      disabled={isLoadingMunicipalities}
                    >
                      {selectedMunicipioId
                        ? `${selectedMunicipio?.name} - ${selectedMunicipio?.state}`
                        : "Selecione um município..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar município..." />
                      <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-auto">
                        {municipalities.map((municipio) => (
                          <CommandItem
                            key={municipio.id}
                            value={`${municipio.name} ${municipio.state}`}
                            onSelect={() => {
                              setSelectedMunicipioId(municipio.id);
                              setOpenMunicipioCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMunicipioId === municipio.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                            <div className="flex flex-col">
                              <span>{municipio.name}</span>
                              <span className="text-xs text-gray-500">{municipio.state}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Seleção de Município para Admin ao escolher Escola */}
            {destinatarioTipo === 'escola' && permissions.canSelectSchool && userRole === 'admin' && (
              <div className="space-y-2 mt-4">
                <Label>
                  Município <span className="text-red-500">*</span>
                </Label>
                <Popover open={openMunicipioCombo} onOpenChange={setOpenMunicipioCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openMunicipioCombo}
                      className="w-full justify-between"
                      disabled={isLoadingMunicipalities}
                    >
                      {selectedMunicipioId
                        ? `${selectedMunicipio?.name} - ${selectedMunicipio?.state}`
                        : "Selecione um município"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar município..." />
                      <CommandEmpty>Nenhum município encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-auto">
                        {municipalities.map((municipio) => (
                          <CommandItem
                            key={municipio.id}
                            value={`${municipio.name} ${municipio.state}`}
                            onSelect={() => {
                              setSelectedMunicipioId(municipio.id);
                              setOpenMunicipioCombo(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMunicipioId === municipio.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <MapPin className="mr-2 h-4 w-4 text-gray-500" />
                            <div className="flex flex-col">
                              <span>{municipio.name}</span>
                              <span className="text-xs text-gray-500">{municipio.state}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-gray-500">
                  Selecione o município para ver as escolas disponíveis
                </p>
              </div>
            )}

            {/* Combobox de Escola (admin e tecadm) */}
            {destinatarioTipo === 'escola' && permissions.canSelectSchool && (
              <div className="space-y-2 mt-4">
                <Label htmlFor="select-escola">
                  Selecione a Escola <span className="text-red-500">*</span>
                </Label>
                {userRole === 'admin' && (
                  <p className="text-xs text-gray-600 mb-2">
                    {selectedMunicipioId 
                      ? `${filteredSchools.length} escola${filteredSchools.length !== 1 ? 's' : ''} encontrada${filteredSchools.length !== 1 ? 's' : ''} no município selecionado` 
                      : 'Selecione um município primeiro'}
                  </p>
                )}
                <Popover open={openEscolaCombo} onOpenChange={setOpenEscolaCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openEscolaCombo}
                      className="w-full justify-between"
                      disabled={isLoadingSchools || (userRole === 'admin' && !selectedMunicipioId)}
                    >
                      {selectedEscolaId
                        ? selectedEscola?.name || selectedEscola?.nome
                        : "Selecione uma escola..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar escola..." />
                      <CommandEmpty>Nenhuma escola encontrada.</CommandEmpty>
                      <CommandGroup className="max-h-[200px] overflow-auto">
                        {filteredSchools.map((escola) => {
                          const escolaMun = municipalities.find(m => m.id === escola.city_id);
                          return (
                            <CommandItem
                              key={escola.id}
                              value={`${escola.name || escola.nome}`}
                              onSelect={() => {
                                setSelectedEscolaId(escola.id);
                                setOpenEscolaCombo(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEscolaId === escola.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <School className="mr-2 h-4 w-4 text-gray-500" />
                              <div className="flex flex-col">
                                <span>{escola.name || escola.nome}</span>
                                {escolaMun && (
                                  <span className="text-xs text-gray-500">
                                    {escolaMun.name} - {escolaMun.state}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Preview do Destinatário */}
          {previewStats && (
            <>
              <Separator />
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <previewStats.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-blue-900">Este aviso será enviado para:</h4>
                    </div>
                    <p className="text-blue-800 font-medium">{previewStats.alcance}</p>
                    <p className="text-sm text-blue-600 mt-1">{previewStats.descricao}</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                    Preview
                  </Badge>
                </div>
              </div>
            </>
          )}

          {/* Botão de Enviar */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTitulo('');
                setMensagem('');
                setDestinatarioTipo(userRole === 'diretor' ? 'escola' : 'todos');
                setSelectedMunicipioId('');
                setSelectedEscolaId('');
              }}
              disabled={isSubmitting}
            >
              Limpar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publicar Aviso
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

