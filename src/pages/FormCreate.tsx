import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, 
  Users, 
  GraduationCap, 
  UserCheck, 
  Building2,
  Eye,
  Send,
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Target,
  Calendar,
  Settings,
  Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { questionsAlunoJovem, questionsAlunoVelho, professorSections, diretorSections } from '../data';
import { Question, SubQuestion } from '@/types/forms';
import { api } from '@/lib/api';

// Tipos para as escolas
interface School {
  id: string;
  name: string;
  domain?: string;
  address?: string;
  city_id?: string;
  created_at?: string;
  students_count?: number;
  classes_count?: number;
  city?: {
    id: string;
    name: string;
    state: string;
    created_at?: string;
  };
}

const FormCreate = () => {
  const navigate = useNavigate();
  const { formType } = useParams<{ formType: string }>();
  const [currentStep, setCurrentStep] = useState<'config' | 'preview' | 'send'>('config');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Configurações do formulário
  const [formConfig, setFormConfig] = useState({
    title: '',
    description: '',
    targetGroups: [] as string[],
    selectedSchools: [] as string[],
    selectAllSchools: false,
    isActive: true,
    deadline: '',
    instructions: ''
  });

  // Mapeamento de tipos de formulário para grupos de destino
  const getTargetGroupsForFormType = (formType: string) => {
    switch (formType) {
      case 'aluno-jovem':
      case 'aluno-velho':
        return ['alunos'];
      case 'professor':
        return ['professores'];
      case 'diretor':
        return ['diretores'];
      default:
        return [];
    }
  };

  // Atualizar grupos de destino quando o tipo de formulário mudar
  useEffect(() => {
    if (formType) {
      const targetGroups = getTargetGroupsForFormType(formType);
      setFormConfig(prev => ({
        ...prev,
        targetGroups
      }));
    }
  }, [formType]);

  // Buscar escolas quando o componente carregar
  useEffect(() => {
    fetchSchools();
  }, []);

  // Filtrar escolas baseado no termo de busca
  const filteredSchools = schools.filter(school => 
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (school.city && school.city.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (school.city && school.city.state.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (school.address && school.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Dados do formulário baseado no tipo
  const getFormData = () => {
    switch (formType) {
      case 'aluno-jovem':
        return {
          name: 'Aluno (Anos Iniciais)',
          description: 'Questionário socioeconômico para estudantes dos anos iniciais do Ensino Fundamental (1° ao 5° ano), EJA 1° ao 5° período e Educação Infantil.',
          questions: questionsAlunoJovem,
          icon: Users,
          color: 'bg-blue-500'
        };
      case 'aluno-velho':
        return {
          name: 'Aluno (Anos Finais)',
          description: 'Questionário socioeconômico para estudantes dos anos finais do Ensino Fundamental (6° ao 9° ano) e EJA 6° ao 9° período.',
          questions: questionsAlunoVelho,
          icon: GraduationCap,
          color: 'bg-green-500'
        };
      case 'professor':
        return {
          name: 'Professor',
          description: 'Questionário de caracterização e condições de trabalho para professores da Educação Básica.',
          questions: professorSections,
          icon: UserCheck,
          color: 'bg-purple-500'
        };
      case 'diretor':
        return {
          name: 'Diretor',
          description: 'Questionário de caracterização da escola e condições de gestão para diretores escolares.',
          questions: diretorSections,
          icon: Building2,
          color: 'bg-orange-500'
        };
      default:
        return null;
    }
  };

  const formData = getFormData();
  const IconComponent = formData?.icon || Users;

  // Grupos de destino disponíveis
  const getTargetGroups = () => {
    switch (formType) {
      case 'aluno-jovem':
        return [
          { id: 'alunos', name: 'Alunos (Anos Iniciais)', description: 'Estudantes de 6 a 11 anos - 1° ao 5° ano, EJA Inicial e Educação Infantil' }
        ];
      case 'aluno-velho':
        return [
          { id: 'alunos', name: 'Alunos (Anos Finais)', description: 'Estudantes de 12 a 17 anos - 6° ao 9° ano e EJA Avançado' }
        ];
      case 'professor':
        return [
          { id: 'professores', name: 'Professores', description: 'Corpo docente da Educação Básica' }
        ];
      case 'diretor':
        return [
          { id: 'diretores', name: 'Diretores', description: 'Gestores escolares e coordenadores' }
        ];
      default:
        return [
          { id: 'alunos', name: 'Alunos', description: 'Todos os estudantes' },
          { id: 'professores', name: 'Professores', description: 'Corpo docente' },
          { id: 'diretores', name: 'Diretores', description: 'Gestores escolares' },
          { id: 'coordenadores', name: 'Coordenadores', description: 'Coordenadores pedagógicos' },
          { id: 'tecnicos', name: 'Técnicos', description: 'Equipe técnica' }
        ];
    }
  };

  const targetGroups = getTargetGroups();

  // Função para buscar escolas
  const fetchSchools = async () => {
    setLoadingSchools(true);
    try {
      const response = await api.get('/school');
      setSchools(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar escolas:', error);
      // Em caso de erro, usar dados mockados como fallback
      setSchools([
        { 
          id: '1', 
          name: 'Escola Municipal João Silva', 
          address: 'Rua das Flores, 123',
          students_count: 150, 
          classes_count: 8,
          city: { id: '1', name: 'São Paulo', state: 'SP' }
        },
        { 
          id: '2', 
          name: 'Escola Estadual Maria Santos', 
          address: 'Av. Paulista, 456',
          students_count: 200, 
          classes_count: 10,
          city: { id: '1', name: 'São Paulo', state: 'SP' }
        },
        { 
          id: '3', 
          name: 'Escola Municipal Pedro Costa', 
          address: 'Rua Copacabana, 789',
          students_count: 120, 
          classes_count: 6,
          city: { id: '2', name: 'Rio de Janeiro', state: 'RJ' }
        },
        { 
          id: '4', 
          name: 'Escola Estadual Ana Oliveira', 
          address: 'Av. Ipanema, 321',
          students_count: 180, 
          classes_count: 9,
          city: { id: '2', name: 'Rio de Janeiro', state: 'RJ' }
        }
      ]);
    } finally {
      setLoadingSchools(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleSchoolToggle = (schoolId: string) => {
    setFormConfig(prev => ({
      ...prev,
      selectedSchools: prev.selectedSchools.includes(schoolId)
        ? prev.selectedSchools.filter(id => id !== schoolId)
        : [...prev.selectedSchools, schoolId],
      selectAllSchools: false
    }));
  };

  const handleSelectAllSchools = () => {
    setFormConfig(prev => ({
      ...prev,
      selectAllSchools: !prev.selectAllSchools,
      selectedSchools: !prev.selectAllSchools ? filteredSchools.map(school => school.id) : []
    }));
  };

  const renderQuestion = (question: Question, index: number) => {
    return (
      <div key={question.id} className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-start gap-3">
          <span className="text-sm font-medium text-gray-500 mt-1">
            {index + 1}.
          </span>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 mb-2">
              {question.texto || question.text}
            </h4>
            
            {question.tipo === 'selecao_unica' && (
              <div className="space-y-2">
                {question.opcoes?.map((option: string, optIndex: number) => (
                  <label key={optIndex} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <span className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                      {String.fromCharCode(65 + optIndex)}
                    </span>
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.tipo === 'multipla_escolha' && (
              <div className="space-y-2">
                {question.subPerguntas?.map((subQ: SubQuestion, subIndex: number) => (
                  <div key={subQ.id} className="ml-4">
                    <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                      <span className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                        {String.fromCharCode(65 + subIndex)}
                      </span>
                      <span className="text-sm text-gray-700">{subQ.texto || subQ.text}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {question.tipo === 'matriz_selecao' && (
              <div className="space-y-3">
                {question.subPerguntas?.map((subQ: SubQuestion, subIndex: number) => (
                  <div key={subQ.id} className="ml-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {subQ.texto || subQ.text}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {question.opcoes?.map((option: string, optIndex: number) => (
                        <label key={optIndex} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                          <span className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
                            {String.fromCharCode(65 + optIndex)}
                          </span>
                          <span className="text-sm text-gray-600">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {question.tipo === 'slider' && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{question.min || 0}</span>
                  <span>{question.max || 100}</span>
                </div>
              </div>
            )}

            {question.tipo === 'textarea' && (
              <textarea 
                className="w-full p-3 border rounded-lg resize-none" 
                rows={3}
                placeholder="Digite sua resposta aqui..."
                disabled
              />
            )}

            {question.obrigatoria && (
              <Badge variant="destructive" className="mt-2 text-xs">
                Obrigatória
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  };


  const handleNextStep = () => {
    if (currentStep === 'config') {
      setCurrentStep('preview');
    } else if (currentStep === 'preview') {
      setCurrentStep('send');
    }
  };

  const handleSendForm = () => {
    // Aqui seria implementada a lógica para enviar o questionário
    console.log('Enviando questionário:', formConfig);
    alert('Questionário enviado com sucesso!');
    navigate('/app/questionarios/cadastro');
  };

  if (!formData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tipo de questionário não encontrado</h1>
          <Button onClick={() => navigate('/app/questionarios/cadastro')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/app/questionarios/cadastro')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Criar Questionário</h1>
          <p className="text-gray-600 mt-1">Configure e envie um novo questionário</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            {formData.name}
          </Badge>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8">
        <div className={`flex items-center gap-2 ${currentStep === 'config' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'config' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="font-medium">Configuração</span>
        </div>
        <div className={`w-16 h-0.5 ${currentStep === 'preview' || currentStep === 'send' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center gap-2 ${currentStep === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="font-medium">Visualização</span>
        </div>
        <div className={`w-16 h-0.5 ${currentStep === 'send' ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center gap-2 ${currentStep === 'send' ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            currentStep === 'send' ? 'bg-blue-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
          <span className="font-medium">Envio</span>
        </div>
      </div>

      {/* Step 1: Configuration */}
      {currentStep === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuração do Questionário
            </CardTitle>
            <CardDescription>
              Configure as informações básicas e grupos de destino do questionário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Questionário</Label>
                <Input
                  id="title"
                  placeholder="Ex: Questionário Socioeconômico 2024"
                  value={formConfig.title}
                  onChange={(e) => setFormConfig(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline">Prazo de Resposta</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formConfig.deadline}
                  onChange={(e) => setFormConfig(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o objetivo e importância deste questionário..."
                value={formConfig.description}
                onChange={(e) => setFormConfig(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instruções Especiais</Label>
              <Textarea
                id="instructions"
                placeholder="Instruções adicionais para os respondentes..."
                value={formConfig.instructions}
                onChange={(e) => setFormConfig(prev => ({ ...prev, instructions: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-4">
              <Label>Grupos de Destino</Label>
              <div className="p-4 bg-gray-50 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {formConfig.targetGroups.map(id => targetGroups.find(g => g.id === id)?.name).join(', ')}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formConfig.targetGroups.map(id => targetGroups.find(g => g.id === id)?.description).join(', ')}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  O grupo de destino é definido automaticamente baseado no tipo de questionário selecionado.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Escolas de Destino</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllSchools}
                    className="text-xs"
                    disabled={filteredSchools.length === 0}
                  >
                    {formConfig.selectAllSchools ? 'Desmarcar Todas' : 'Selecionar Todas'}
                  </Button>
                </div>
              </div>
              
              {/* Campo de busca */}
              <div className="relative">
                <Input
                  placeholder="Buscar escolas por nome, cidade, estado ou endereço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {searchTerm ? (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  ) : (
                    <svg
                      className="h-4 w-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {loadingSchools ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-600">Carregando escolas...</span>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredSchools.map((school) => (
                      <div
                        key={school.id}
                        className={`p-3 cursor-pointer transition-colors ${
                          formConfig.selectedSchools.includes(school.id) || formConfig.selectAllSchools
                            ? 'bg-blue-50 border-l-4 border-blue-500'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSchoolToggle(school.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            formConfig.selectedSchools.includes(school.id) || formConfig.selectAllSchools
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {(formConfig.selectedSchools.includes(school.id) || formConfig.selectAllSchools) && (
                              <CheckCircle className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{school.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>
                                {school.city ? `${school.city.name}, ${school.city.state}` : 'Localização não informada'}
                              </span>
                              {school.address && (
                                <span className="text-xs text-gray-500">
                                  {school.address}
                                </span>
                              )}
                              {school.students_count && (
                                <span className="text-xs text-gray-500">
                                  {school.students_count} alunos
                                </span>
                              )}
                              {school.classes_count && (
                                <span className="text-xs text-gray-500">
                                  {school.classes_count} turmas
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredSchools.length === 0 && !loadingSchools && (
                      <div className="p-8 text-center text-gray-500">
                        <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>
                          {searchTerm 
                            ? `Nenhuma escola encontrada para "${searchTerm}"`
                            : 'Nenhuma escola encontrada'
                          }
                        </p>
                        {searchTerm && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSearchTerm('')}
                            className="mt-2"
                          >
                            Limpar busca
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {formConfig.selectAllSchools 
                  ? `Todas as ${filteredSchools.length} escolas selecionadas`
                  : `${formConfig.selectedSchools.length} de ${filteredSchools.length} escolas selecionadas`
                }
                {searchTerm && schools.length !== filteredSchools.length && (
                  <span className="ml-2 text-blue-600">
                    (filtradas de {schools.length} total)
                  </span>
                )}
              </p>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={handleNextStep} 
                disabled={!formConfig.title || (formConfig.selectedSchools.length === 0 && !formConfig.selectAllSchools)}
              >
                Próximo: Visualização
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Preview */}
      {currentStep === 'preview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visualização do Questionário
              </CardTitle>
              <CardDescription>
                Veja como o questionário será apresentado aos respondentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{formConfig.title}</h2>
                  <p className="text-gray-700 mb-4">{formConfig.description}</p>
                  {formConfig.instructions && (
                    <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>Instruções:</strong> {formConfig.instructions}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>Público: {formConfig.targetGroups.map(id => targetGroups.find(g => g.id === id)?.name).join(', ')}</span>
                    </div>
                    {formConfig.deadline && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Prazo: {new Date(formConfig.deadline).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-blue-800">
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">
                        {formConfig.selectAllSchools 
                          ? `Todas as ${schools.length} escolas`
                          : `${formConfig.selectedSchools.length} escola(s) selecionada(s)`
                        }
                      </span>
                    </div>
                    {!formConfig.selectAllSchools && formConfig.selectedSchools.length > 0 && (
                      <div className="mt-2 text-xs text-blue-700">
                        {formConfig.selectedSchools.slice(0, 3).map(id => {
                          const school = schools.find(s => s.id === id);
                          return school?.name;
                        }).join(', ')}
                        {formConfig.selectedSchools.length > 3 && ` e mais ${formConfig.selectedSchools.length - 3} escola(s)`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {Array.isArray(formData.questions) ? (
                    formData.questions.map((question, index) => 
                      renderQuestion(question, index)
                    )
                  ) : (
                    formData.questions.map((section, sectionIndex) => (
                      <div key={section.title} className="border rounded-lg">
                        <div 
                          className="p-4 bg-gray-50 border-b cursor-pointer flex items-center justify-between"
                          onClick={() => toggleSection(section.title)}
                        >
                          <h3 className="font-medium text-gray-900">{section.title}</h3>
                          {expandedSections.has(section.title) ? 
                            <ChevronDown className="h-4 w-4" /> : 
                            <ChevronRight className="h-4 w-4" />
                          }
                        </div>
                        {expandedSections.has(section.title) && (
                          <div className="p-4 space-y-4">
                            {section.questions.map((question, index) => 
                              renderQuestion(question, index)
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep('config')}>
              Voltar: Configuração
            </Button>
            <Button onClick={handleNextStep}>
              Próximo: Envio
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Send */}
      {currentStep === 'send' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Questionário
            </CardTitle>
            <CardDescription>
              Revise as configurações e envie o questionário para os grupos selecionados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Resumo do Questionário</h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Título:</strong> {formConfig.title}</div>
                  <div><strong>Público:</strong> {formConfig.targetGroups.map(id => targetGroups.find(g => g.id === id)?.name).join(', ')}</div>
                  <div><strong>Escolas:</strong> {formConfig.selectAllSchools 
                    ? `Todas as ${schools.length} escolas`
                    : `${formConfig.selectedSchools.length} escola(s) selecionada(s)`
                  }</div>
                  <div><strong>Prazo:</strong> {formConfig.deadline ? new Date(formConfig.deadline).toLocaleDateString('pt-BR') : 'Não definido'}</div>
                  <div><strong>Status:</strong> {formConfig.isActive ? 'Ativo' : 'Inativo'}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Ações Disponíveis</h3>
                <div className="space-y-2">
                  <Button className="w-full" onClick={handleSendForm}>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Questionário
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar Novamente
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Editar Configurações
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Pronto para Envio</h4>
                  <p className="text-sm text-green-700 mt-1">
                    O questionário está configurado e pronto para ser enviado. Após o envio, os usuários dos grupos selecionados receberão uma notificação para preenchimento.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep('preview')}>
                Voltar: Visualização
              </Button>
              <Button onClick={handleSendForm} className="bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4 mr-2" />
                Confirmar Envio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FormCreate;
