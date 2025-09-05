import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Building2, 
  Plus, 
  Edit, 
  Eye,
  Calendar,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FormType } from '@/types/forms';

const FormRegistration = () => {
  const navigate = useNavigate();
  const [selectedForm, setSelectedForm] = useState<string | null>(null);

  // Dados mockados dos tipos de formulários
  const formTypes: FormType[] = [
    {
      id: 'aluno-jovem',
      name: 'Aluno (Anos Iniciais)',
      description: 'Formulário socioeconômico para estudantes dos anos iniciais do Ensino Fundamental (1° ao 5° ano), EJA 1° ao 5° período e Educação Infantil.',
      targetAudience: 'Estudantes de 6 a 11 anos',
      educationLevel: 'Anos Iniciais, EJA Inicial, Educação Infantil',
      questions: [], // Será preenchido com questionsAlunoJovem
      icon: 'Users',
      color: 'bg-blue-500',
      ageRange: '6-11 anos',
      gradeRange: '1° ao 5° ano',
      specialBadge: 'Infantil'
    },
    {
      id: 'aluno-velho',
      name: 'Aluno (Anos Finais)',
      description: 'Formulário socioeconômico para estudantes dos anos finais do Ensino Fundamental (6° ao 9° ano) e EJA 6° ao 9° período.',
      targetAudience: 'Estudantes de 12 a 17 anos',
      educationLevel: 'Anos Finais, EJA Avançado',
      questions: [], // Será preenchido com questionsAlunoVelho
      icon: 'GraduationCap',
      color: 'bg-green-500',
      ageRange: '12-17 anos',
      gradeRange: '6° ao 9° ano',
      specialBadge: 'Adolescente'
    },
    {
      id: 'professor',
      name: 'Professor',
      description: 'Formulário de caracterização e condições de trabalho para professores da Educação Básica.',
      targetAudience: 'Professores da Educação Básica',
      educationLevel: 'Todos os níveis',
      questions: [], // Será preenchido com professorSections
      icon: 'UserCheck',
      color: 'bg-purple-500'
    },
    {
      id: 'diretor',
      name: 'Diretor',
      description: 'Formulário de caracterização da escola e condições de gestão para diretores escolares.',
      targetAudience: 'Diretores de escolas',
      educationLevel: 'Todos os níveis',
      questions: [], // Será preenchido com diretorSections
      icon: 'Building2',
      color: 'bg-orange-500'
    }
  ];

  // Dados mockados de formulários já cadastrados
  const mockFormRegistrations = [
    {
      id: '1',
      formType: 'aluno-jovem',
      title: 'Questionário Socioeconômico - Anos Iniciais 2024',
      description: 'Formulário para coleta de dados socioeconômicos dos estudantes dos anos iniciais',
      targetAudience: ['alunos'],
      isActive: true,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15'),
      createdBy: 'Admin'
    },
    {
      id: '2',
      formType: 'professor',
      title: 'Avaliação Docente - 1º Semestre 2024',
      description: 'Formulário de avaliação das condições de trabalho dos professores',
      targetAudience: ['professores'],
      isActive: true,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01'),
      createdBy: 'Admin'
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      Users,
      GraduationCap,
      UserCheck,
      Building2
    };
    return icons[iconName as keyof typeof icons] || Users;
  };

  const handleCreateForm = (formType: FormType) => {
    navigate(`/app/formularios/criar/${formType.id}`);
  };

  const handleEditForm = (formId: string) => {
    console.log('Editando formulário:', formId);
  };

  const handleViewForm = (formId: string) => {
    navigate(`/app/formularios/${formId}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cadastro de Formulários</h1>
          <p className="text-gray-600 mt-2">
            Gerencie os formulários socioeconômicos e de avaliação da instituição
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      {/* Tipos de Formulários Disponíveis */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Tipos de Formulários Disponíveis</h2>
        
        {/* Formulários para Alunos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-green-500 rounded-full"></div>
            <h3 className="text-lg font-medium text-gray-800">Formulários para Alunos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formTypes.filter(ft => ft.id.includes('aluno')).map((formType) => {
              const IconComponent = getIcon(formType.icon);
              return (
                <Card 
                  key={formType.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedForm === formType.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedForm(formType.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${formType.color}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {formType.educationLevel.split(',')[0]}
                        </Badge>
                        {formType.specialBadge && (
                          <Badge 
                            variant={formType.id === 'aluno-jovem' ? 'default' : 'outline'} 
                            className={`text-xs ${
                              formType.id === 'aluno-jovem' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-green-100 text-green-800 border-green-200'
                            }`}
                          >
                            {formType.specialBadge}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {formType.name}
                      {formType.ageRange && (
                        <Badge variant="outline" className="text-xs">
                          {formType.ageRange}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {formType.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        <span>{formType.targetAudience}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4" />
                        <span>{formType.educationLevel}</span>
                      </div>
                      {formType.gradeRange && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Séries: {formType.gradeRange}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateForm(formType);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Formulário
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Formulários para Profissionais */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-orange-500 rounded-full"></div>
            <h3 className="text-lg font-medium text-gray-800">Formulários para Profissionais</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {formTypes.filter(ft => !ft.id.includes('aluno')).map((formType) => {
              const IconComponent = getIcon(formType.icon);
              return (
                <Card 
                  key={formType.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedForm === formType.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedForm(formType.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg ${formType.color}`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {formType.educationLevel.split(',')[0]}
                        </Badge>
                        {formType.specialBadge && (
                          <Badge 
                            variant={formType.id === 'aluno-jovem' ? 'default' : 'outline'} 
                            className={`text-xs ${
                              formType.id === 'aluno-jovem' 
                                ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                : 'bg-green-100 text-green-800 border-green-200'
                            }`}
                          >
                            {formType.specialBadge}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {formType.name}
                      {formType.ageRange && (
                        <Badge variant="outline" className="text-xs">
                          {formType.ageRange}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {formType.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Target className="h-4 w-4" />
                        <span>{formType.targetAudience}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <GraduationCap className="h-4 w-4" />
                        <span>{formType.educationLevel}</span>
                      </div>
                      {formType.gradeRange && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>Séries: {formType.gradeRange}</span>
                        </div>
                      )}
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateForm(formType);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Formulário
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Formulários Cadastrados */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Formulários Cadastrados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockFormRegistrations.map((form) => {
            const formType = formTypes.find(ft => ft.id === form.formType);
            const IconComponent = formType ? getIcon(formType.icon) : Users;
            
            return (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${formType?.color || 'bg-gray-500'}`}>
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={form.isActive ? "default" : "secondary"}>
                        {form.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{form.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {form.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Criado em {form.createdAt.toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>Público: {form.targetAudience.join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewForm(form.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Visualizar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleEditForm(form.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Mensagem quando não há formulários cadastrados */}
      {mockFormRegistrations.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum formulário cadastrado
            </h3>
            <p className="text-gray-600 mb-4">
              Comece criando um novo formulário usando os tipos disponíveis acima.
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Formulário
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FormRegistration;
