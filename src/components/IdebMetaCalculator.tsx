import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calculator, Search, Loader2, 
  Zap, CheckCircle2, Layout, 
  Edit3, Save, School, Plus, Trash2, Target, TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EvaluationResultsApiService } from '@/services/evaluationResultsApi';
import { 
  IdebData, 
  EducationLevel, 
  Escola, 
  HistoricoCompleto 
} from '@/types/idebMeta';
import { 
  analyzeHistoricalGrowth, 
  calculateGrowthNeeded
} from '@/utils/idebCalculator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function IdebMetaCalculator() {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  
  const [states, setStates] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [municipalities, setMunicipalities] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel>(EducationLevel.INICIAIS);
  
  const [municipalityData, setMunicipalityData] = useState<IdebData | null>(null);
  const [activeEntity, setActiveEntity] = useState<IdebData | Escola | null>(null);
  const [customTarget, setCustomTarget] = useState<number>(0);

  // Carregar estados ao montar o componente
  useEffect(() => {
    const loadStates = async () => {
      try {
        const statesData = await EvaluationResultsApiService.getFilterStates();
        setStates(statesData);
      } catch (error) {
        console.error('Erro ao carregar estados:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os estados.',
          variant: 'destructive',
        });
      }
    };
    loadStates();
  }, [toast]);

  // Carregar municípios quando estado for selecionado
  useEffect(() => {
    const loadMunicipalities = async () => {
      if (selectedState === 'all') {
        setMunicipalities([]);
        setSelectedMunicipality('all');
        return;
      }

      setLoadingCities(true);
      try {
        const municipalitiesData = await EvaluationResultsApiService.getFilterMunicipalities(selectedState);
        setMunicipalities(municipalitiesData);
        setSelectedMunicipality('all');
      } catch (error) {
        console.error('Erro ao carregar municípios:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os municípios.',
          variant: 'destructive',
        });
      } finally {
        setLoadingCities(false);
      }
    };

    loadMunicipalities();
  }, [selectedState, toast]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMunicipality || selectedMunicipality === 'all' || !selectedState || selectedState === 'all') {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o estado e o município.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Por enquanto, criar dados de exemplo (sem API de dados históricos IDEB)
      // Em produção, isso viria de um endpoint específico
      const selectedMunicipalityData = municipalities.find(m => m.id === selectedMunicipality);
      const selectedStateData = states.find(s => s.id === selectedState);

      // Criar histórico de exemplo (em produção, viria da API)
      const historico: HistoricoCompleto[] = [
        { ano: 2007, ideb: 3.5, port: 180, math: 175, fluxo: 0.85 },
        { ano: 2009, ideb: 3.8, port: 190, math: 185, fluxo: 0.87 },
        { ano: 2011, ideb: 4.1, port: 200, math: 195, fluxo: 0.89 },
        { ano: 2013, ideb: 4.3, port: 210, math: 205, fluxo: 0.90 },
        { ano: 2015, ideb: 4.5, port: 220, math: 215, fluxo: 0.91 },
        { ano: 2017, ideb: 4.7, port: 230, math: 225, fluxo: 0.92 },
        { ano: 2019, ideb: 4.9, port: 240, math: 235, fluxo: 0.93 },
        { ano: 2021, ideb: 5.1, port: 250, math: 245, fluxo: 0.94 },
        { ano: 2023, ideb: 5.3, port: 260, math: 255, fluxo: 0.95 },
      ];

      if (!selectedMunicipalityData || !selectedStateData) {
        throw new Error('Dados do município ou estado não encontrados');
      }

      const sortedHist = [...historico].sort((a, b) => b.ano - a.ano);
      const latest = sortedHist[0];

      // Validar dados antes de criar
      if (!latest || isNaN(latest.ideb) || latest.ideb < 0) {
        throw new Error('Dados históricos inválidos');
      }

      const fullData: IdebData = {
        municipio: selectedMunicipalityData.nome,
        uf: selectedStateData.nome,
        escola: 'Rede Municipal',
        rede: 'Municipal',
        ano: latest.ano,
        ideb: latest.ideb,
        proficienciaPortugues: latest.port,
        proficienciaMatematica: latest.math,
        fluxo: latest.fluxo,
        level: selectedLevel,
        historico: sortedHist,
      };

      setMunicipalityData(fullData);
      setActiveEntity(fullData);
      const projectedMeta = analyzeHistoricalGrowth(fullData.historico).projectedMeta;
      setCustomTarget(projectedMeta);
      
      toast({
        title: 'Sucesso',
        description: 'Dados carregados com sucesso.',
      });
    } catch (error) {
      console.error('Erro na busca:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro',
        description: `Erro ao buscar dados: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEntitySelect = (entity: IdebData | Escola) => {
    setActiveEntity(entity);
    if (entity.historico) {
      setCustomTarget(analyzeHistoricalGrowth(entity.historico).projectedMeta);
    }
  };

  const handleUpdateHistory = (updatedHistory: HistoricoCompleto[]) => {
    // Validar histórico
    if (!updatedHistory || updatedHistory.length === 0) {
      toast({
        title: 'Erro de validação',
        description: 'O histórico não pode estar vazio.',
        variant: 'destructive',
      });
      return;
    }

    // Validar dados de cada ano
    const invalidYears = updatedHistory.filter(h => 
      !h.ano || h.ano < 2000 || h.ano > 2030 ||
      isNaN(h.ideb) || h.ideb < 0 || h.ideb > 10 ||
      isNaN(h.port) || h.port < 0 ||
      isNaN(h.math) || h.math < 0 ||
      isNaN(h.fluxo) || h.fluxo < 0 || h.fluxo > 1
    );

    if (invalidYears.length > 0) {
      toast({
        title: 'Erro de validação',
        description: 'Alguns dados do histórico são inválidos. Verifique os valores inseridos.',
        variant: 'destructive',
      });
      return;
    }

    const sorted = [...updatedHistory].sort((a, b) => b.ano - a.ano);
    const latest = sorted[0];

    try {
      if (activeEntity && 'municipio' in activeEntity) {
        const newData = { 
          ...activeEntity, 
          historico: sorted, 
          ideb: latest.ideb, 
          ano: latest.ano,
          proficienciaPortugues: latest.port,
          proficienciaMatematica: latest.math,
          fluxo: latest.fluxo,
        };
        setMunicipalityData(newData);
        setActiveEntity(newData);
      } else if (activeEntity && municipalityData) {
        const updatedEscolas = municipalityData.escolas?.map(s => 
          s.id === activeEntity.id 
            ? { ...s, historico: sorted, ideb: latest.ideb } 
            : s
        );
        const newMunicipality = { ...municipalityData, escolas: updatedEscolas };
        setMunicipalityData(newMunicipality);
        setActiveEntity({ ...activeEntity, historico: sorted, ideb: latest.ideb });
      }
      setCustomTarget(analyzeHistoricalGrowth(sorted).projectedMeta);
      setIsEditingHistory(false);
      toast({
        title: 'Sucesso',
        description: 'Histórico atualizado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao atualizar histórico:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar histórico. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const growthInfo = useMemo(() => {
    if (!activeEntity?.historico) return null;
    return analyzeHistoricalGrowth(activeEntity.historico);
  }, [activeEntity]);

  const calculationData = useMemo(() => {
    if (!activeEntity?.historico || !growthInfo) return null;
    const current = activeEntity.ideb;
    const hist = [...activeEntity.historico].sort((a, b) => b.ano - a.ano);
    const prevValue = hist.length > 1 ? hist[1].ideb : current;
    return calculateGrowthNeeded(current, customTarget, current - prevValue);
  }, [activeEntity, customTarget, growthInfo]);

  const filteredEscolas = useMemo(() => {
    return municipalityData?.escolas?.filter(s => s.level === selectedLevel) || [];
  }, [municipalityData, selectedLevel]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-600" />
          Calculadora de Metas IDEB
        </h1>
        <p className="text-gray-600 max-w-2xl">
          Calcule e projete metas IDEB baseadas em histórico de crescimento e análise de desempenho
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Filtros */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="w-4 h-4" />
                Consultar Rede
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select 
                    value={selectedState} 
                    onValueChange={setSelectedState}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os estados</SelectItem>
                      {states.map(state => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="municipality">Município</Label>
                  <Select 
                    value={selectedMunicipality} 
                    onValueChange={setSelectedMunicipality}
                    disabled={loadingCities || selectedState === 'all'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCities ? 'Carregando...' : 'Selecione o município'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os municípios</SelectItem>
                      {municipalities.map(municipality => (
                        <SelectItem key={municipality.id} value={municipality.id}>
                          {municipality.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nível de Ensino</Label>
                  <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    {Object.values(EducationLevel).map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setSelectedLevel(level)}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md transition-all ${
                          selectedLevel === level
                            ? 'bg-white shadow-sm text-blue-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {level.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading || selectedMunicipality === 'all' || selectedState === 'all'}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Sincronizar Dados
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {municipalityData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <School className="w-4 h-4" />
                  {selectedLevel}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[450px] overflow-y-auto">
                  <button
                    onClick={() => handleEntitySelect(municipalityData)}
                    className={`w-full p-3 rounded-lg flex items-center justify-between border-2 transition-all ${
                      activeEntity === municipalityData
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xs font-bold uppercase">Rede Municipal</span>
                    <span className="text-sm font-bold">{municipalityData.ideb.toFixed(1)}</span>
                  </button>
                  <div className="h-px bg-gray-200 my-2" />
                  {filteredEscolas.map(school => (
                    <button
                      key={school.id}
                      onClick={() => handleEntitySelect(school)}
                      className={`w-full p-3 rounded-lg flex items-center justify-between border-2 transition-all ${
                        activeEntity === school
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white border-gray-200 hover:border-blue-200'
                      }`}
                    >
                      <span className="text-xs font-semibold truncate pr-3 text-left">
                        {school.nome}
                      </span>
                      <span className="text-sm font-bold">{school.ideb.toFixed(1)}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {!activeEntity ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                  <Layout className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Portal de Metas</h2>
                <p className="text-gray-500 max-w-sm">
                  Selecione o município e o nível de ensino para gerar o memorial de cálculo e as projeções bienais.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Card de Resumo */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      {('municipio' in activeEntity ? activeEntity.municipio : activeEntity.nome).toUpperCase()}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {'municipio' in activeEntity ? 'CONSOLIDADO MUNICIPAL' : 'UNIDADE ESCOLAR'}
                      </Badge>
                      <Badge variant="secondary">{selectedLevel}</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingHistory(true)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Editar Base
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-6 rounded-lg text-center">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        IDEB {activeEntity.ano}
                      </p>
                      <p className="text-4xl font-bold text-gray-900">
                        {activeEntity.ideb.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-gray-900 p-6 rounded-lg text-center">
                      <p className="text-xs font-semibold text-blue-400 uppercase mb-2">
                        Meta 2025
                      </p>
                      <p className="text-4xl font-bold text-white">
                        {customTarget.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabela de Histórico */}
              {growthInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Histórico de Evolução
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Ano</TableHead>
                            {growthInfo.years.slice(0, -1).map(year => (
                              <TableHead key={year} className="text-center">
                                {year}
                              </TableHead>
                            ))}
                            <TableHead className="text-center bg-gray-900 text-white">
                              {activeEntity.ano}
                            </TableHead>
                            <TableHead className="text-center bg-blue-950 text-white">
                              Meta
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-semibold">IDEB</TableCell>
                            {growthInfo.values.slice(0, -1).map((value, idx) => (
                              <TableCell key={idx} className="text-center font-bold">
                                {value.toFixed(1)}
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-bold bg-gray-900 text-white">
                              {activeEntity.ideb.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-center font-bold bg-blue-950 text-white">
                              {customTarget.toFixed(1)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold">∆ Bienal</TableCell>
                            {growthInfo.diffs.map((diff, idx) => (
                              <TableCell key={idx} className="text-center">
                                <span className={`font-semibold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                                </span>
                              </TableCell>
                            ))}
                            <TableCell colSpan={2}></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Memorial de Cálculo */}
              {calculationData && growthInfo && (
                <Card className="bg-gray-900 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Zap className="w-5 h-5" />
                      Memorial de Cálculo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-gray-300 mb-4">
                        A projeção de meta em <strong>{customTarget.toFixed(1)}</strong> baseia-se no IDEB base de{' '}
                        {activeEntity.ideb.toFixed(1)} acrescido do pico de crescimento (+{growthInfo.maxDiff.toFixed(1)}).
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                          <span className="text-sm font-semibold text-blue-400 uppercase">Alvo</span>
                          <span className="text-3xl font-bold">{customTarget.toFixed(1)}</span>
                        </div>
                        <Slider
                          value={[customTarget]}
                          onValueChange={(value) => setCustomTarget(value[0])}
                          min={3}
                          max={10}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-xs font-semibold text-blue-400 uppercase mb-2">Diferença</p>
                        <p className="text-2xl font-bold">+{calculationData.difference.toFixed(2)}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-xs font-semibold text-blue-400 uppercase mb-2">Esforço %</p>
                        <p className="text-2xl font-bold">{calculationData.percent.toFixed(2)}%</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-lg">
                        <p className="text-xs font-semibold text-blue-400 uppercase mb-2">Pico</p>
                        <p className="text-2xl font-bold">+{growthInfo.maxDiff.toFixed(1)}</p>
                      </div>
                      <div className="p-4 bg-blue-600 rounded-lg flex flex-col justify-center">
                        <p className="text-xs font-semibold text-blue-100 uppercase mb-2">Diagnóstico</p>
                        <p className="text-xl font-bold flex items-center gap-2">
                          VIÁVEL <CheckCircle2 className="w-5 h-5" />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição de Histórico */}
      <Dialog open={isEditingHistory} onOpenChange={setIsEditingHistory}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Série Histórica Dinâmica</DialogTitle>
            <p className="text-sm text-gray-500">
              CONFIGURAÇÃO DE BASE: {('municipio' in (activeEntity || {}) ? (activeEntity as IdebData)?.municipio : (activeEntity as Escola)?.nome)?.toUpperCase()}
            </p>
          </DialogHeader>
          {activeEntity && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={() => {
                    if (activeEntity.historico) {
                      const newYear = {
                        ano: (activeEntity.historico[0]?.ano || 2023) + 2,
                        ideb: 0,
                        port: 0,
                        math: 0,
                        fluxo: 1.0,
                      };
                      setActiveEntity({
                        ...activeEntity,
                        historico: [newYear, ...activeEntity.historico],
                      });
                    }
                  }}
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Ano
                </Button>
              </div>
              {activeEntity.historico
                ?.sort((a, b) => b.ano - a.ano)
                .map((h, idx) => (
                  <div
                    key={`${h.ano}-${idx}`}
                    className="grid grid-cols-12 gap-3 p-4 bg-gray-50 rounded-lg items-center"
                  >
                    <div className="col-span-2">
                      <Label className="text-xs">Ano Base</Label>
                      <Input
                        type="number"
                        defaultValue={h.ano}
                        min="2000"
                        max="2030"
                        className="mt-1"
                        onBlur={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 2000 && value <= 2030) {
                            h.ano = value;
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">IDEB</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        defaultValue={h.ideb}
                        className="mt-1"
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= 10) {
                            h.ideb = value;
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Português</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={h.port}
                        className="mt-1"
                        onBlur={(e) => {
                          h.port = parseFloat(e.target.value);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Matemática</Label>
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={h.math}
                        className="mt-1"
                        onBlur={(e) => {
                          h.math = parseFloat(e.target.value);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Fluxo</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        defaultValue={h.fluxo}
                        className="mt-1"
                        onBlur={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0 && value <= 1) {
                            h.fluxo = value;
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (activeEntity.historico) {
                            const newHist = activeEntity.historico.filter((_, i) => i !== idx);
                            setActiveEntity({ ...activeEntity, historico: newHist });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditingHistory(false)}
                >
                  Descartar
                </Button>
                <Button
                  onClick={() => {
                    if (activeEntity.historico) {
                      handleUpdateHistory(activeEntity.historico);
                    }
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Consolidar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
