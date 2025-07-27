import React, { useState } from 'react';
import { ResultsTable } from './index';

// Dados de exemplo para demonstração
const mockStudents = [
    {
        id: '1',
        nome: 'Ana Silva',
        turma: '9º A',
        nota: 8.5,
        proficiencia: 350,
        classificacao: 'Adequado' as const,
        acertos: 17,
        total_questoes: 20,
        status: 'concluida' as const,
        tempo_gasto: 3600 // 60 minutos
    },
    {
        id: '2',
        nome: 'João Santos',
        turma: '9º A',
        nota: 9.2,
        proficiencia: 425,
        classificacao: 'Avançado' as const,
        acertos: 18,
        total_questoes: 20,
        status: 'concluida' as const,
        tempo_gasto: 3300 // 55 minutos
    },
    {
        id: '3',
        nome: 'Maria Oliveira',
        turma: '9º B',
        nota: 6.8,
        proficiencia: 280,
        classificacao: 'Básico' as const,
        acertos: 14,
        total_questoes: 20,
        status: 'concluida' as const,
        tempo_gasto: 4200 // 70 minutos
    },
    {
        id: '4',
        nome: 'Pedro Costa',
        turma: '9º A',
        nota: 0,
        proficiencia: 0,
        classificacao: 'Abaixo do Básico' as const,
        acertos: 0,
        total_questoes: 20,
        status: 'pendente' as const, // Este será filtrado automaticamente
        tempo_gasto: 0
    }
];

const ResultsTableExample: React.FC = () => {
    const [showFiltered, setShowFiltered] = useState(true);
    const [includeIncomplete, setIncludeIncomplete] = useState(false);

    // Simular filtro de dados
    const filteredStudents = includeIncomplete 
        ? mockStudents 
        : mockStudents.filter(s => s.status === 'concluida' && s.nota > 0);

    const handleViewStudentDetails = (studentId: string) => {
        alert(`Ver detalhes do aluno ID: ${studentId}`);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Exemplo: ResultsTable Component</h2>
                
                {/* Controles de demonstração */}
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            checked={showFiltered}
                            onChange={(e) => setShowFiltered(e.target.checked)}
                        />
                        <span className="text-sm">Marcar como dados filtrados</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            checked={includeIncomplete}
                            onChange={(e) => setIncludeIncomplete(e.target.checked)}
                        />
                        <span className="text-sm">Incluir alunos incompletos</span>
                    </label>
                </div>

                <div className="text-sm text-gray-600 mb-4">
                    <p><strong>Dados originais:</strong> {mockStudents.length} alunos</p>
                    <p><strong>Dados enviados:</strong> {filteredStudents.length} alunos</p>
                    <p><strong>isFiltered:</strong> {showFiltered ? '✅ true' : '❌ false'}</p>
                </div>
            </div>

            {/* Exemplo 1: Uso correto */}
            <div>
                <h3 className="text-lg font-semibold mb-2">
                    {showFiltered ? '✅ Uso Correto' : '❌ Uso Incorreto'}
                </h3>
                <ResultsTable
                    students={filteredStudents}
                    isFiltered={showFiltered}
                    onViewStudentDetails={handleViewStudentDetails}
                    title="Exemplo - Resultados da Turma"
                    showActions={true}
                />
            </div>

            {/* Código de exemplo */}
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
                <pre>{`// Código usado neste exemplo:
const filteredStudents = students.filter(s => 
    s.status === 'concluida' && s.nota > 0
);

<ResultsTable
    students={filteredStudents}
    isFiltered={${showFiltered}}
    onViewStudentDetails={(id) => alert(\`Ver aluno \${id}\`)}
    title="Exemplo - Resultados da Turma"
    showActions={true}
/>`}</pre>
            </div>

            {/* Estados da tabela */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">Estado: Erro</h4>
                    <p className="text-sm text-red-700">
                        Quando `isFiltered={false}` - Exibe alerta vermelho
                    </p>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">Estado: Vazio</h4>
                    <p className="text-sm text-gray-700">
                        Quando não há alunos concluídos - Exibe estado vazio
                    </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Estado: Sucesso</h4>
                    <p className="text-sm text-green-700">
                        Quando há dados válidos - Exibe tabela completa
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResultsTableExample; 