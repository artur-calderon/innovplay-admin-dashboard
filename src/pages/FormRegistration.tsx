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
  Calendar,
  Target,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FormType } from '@/types/forms';

const FormRegistration = () => {
  const navigate = useNavigate();
  const [selectedForm, setSelectedForm] = useState<string | null>(null);

  // Dados mockados dos tipos de questionários
  const formTypes: FormType[] = [
    {
      id: 'aluno-jovem',
      name: 'Aluno (Anos Iniciais)',
      description: 'Questionário socioeconômico para estudantes dos anos iniciais do Ensino Fundamental (1° ao 5° ano), EJA 1° ao 5° período e Educação Infantil.',
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
      description: 'Questionário socioeconômico para estudantes dos anos finais do Ensino Fundamental (6° ao 9° ano) e EJA 6° ao 9° período.',
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
      description: 'Questionário de caracterização e condições de trabalho para professores da Educação Básica.',
      targetAudience: 'Professores da Educação Básica',
      educationLevel: 'Todos os níveis',
      questions: [], // Será preenchido com professorQuestions
      icon: 'UserCheck',
      color: 'bg-purple-500'
    },
    {
      id: 'diretor',
      name: 'Diretor',
      description: 'Questionário de caracterização da escola e condições de gestão para diretores escolares.',
      targetAudience: 'Diretores de escolas',
      educationLevel: 'Todos os níveis',
      questions: [], // Será preenchido com diretorQuestions
      icon: 'Building2',
      color: 'bg-orange-500'
    },
    {
      id: 'secretario',
      name: 'Secretário Municipal de Educação',
      description: 'Questionário de caracterização e gestão educacional para secretários municipais de educação.',
      targetAudience: 'Secretários Municipais de Educação',
      educationLevel: 'Gestão Municipal',
      questions: [], // Será preenchido com secretarioSections
      icon: 'Shield',
      color: 'bg-indigo-500'
    }
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      Users,
      GraduationCap,
      UserCheck,
      Building2,
      Shield
    };
    return icons[iconName as keyof typeof icons] || Users;
  };

  const handleCreateForm = (formType: FormType) => {
    navigate(`/app/questionarios/criar/${formType.id}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cadastro de Questionários</h1>
          <p className="text-gray-600 mt-2">
            Gerencie os questionários socioeconômicos e de avaliação da instituição
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Questionário
        </Button>
      </div>

      {/* Tipos de Questionários Disponíveis */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Tipos de Questionários Disponíveis</h2>
        
        {/* Questionários para Alunos */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-green-500 rounded-full"></div>
            <h3 className="text-lg font-medium text-gray-800">Questionários para Alunos</h3>
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
                      Criar Questionário
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Questionários para Profissionais */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-orange-500 rounded-full"></div>
            <h3 className="text-lg font-medium text-gray-800">Questionários para Profissionais</h3>
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
                      Criar Questionário
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};

export default FormRegistration;
