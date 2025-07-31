import React, { useState } from 'react';
import { TestTube, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { useTestWithKnownData } from '../../../hooks/useResultsTable';

interface TestResult {
  student: string;
  isValid: boolean;
  data: any;
  issues: string[];
}

export const DataConsistencyTest: React.FC = () => {
  const { knownTestData, testValidation } = useTestWithKnownData();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTest = () => {
    setIsRunning(true);
    console.log('🧪 EXECUTANDO TESTE DE CONSISTÊNCIA...');
    
    // Executar teste
    const results = testValidation();
    setTestResults(results);
    
    setIsRunning(false);
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    );
  };

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center gap-3 mb-6">
        <TestTube className="h-6 w-6 text-purple-600" />
        <h2 className="text-xl font-semibold text-gray-900">Teste de Consistência de Dados</h2>
      </div>

      <div className="mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Sobre o Teste</h3>
              <p className="text-blue-800 text-sm">
                Este teste verifica a consistência dos dados usando valores conhecidos do banco de dados.
                Ele valida tipos de dados, consistência matemática e formatação dos campos.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunTest}
          disabled={isRunning}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TestTube className="h-4 w-4 mr-2" />
          {isRunning ? 'Executando...' : 'Executar Teste'}
        </button>
      </div>

      {/* Dados de Teste */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Dados de Teste</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Avaliação ID:</span> {knownTestData.evaluationId}
            </div>
            <div>
              <span className="font-medium">Total de Questões:</span> {knownTestData.totalQuestions}
            </div>
            <div>
              <span className="font-medium">Alunos de Teste:</span> {knownTestData.students.length}
            </div>
          </div>
        </div>
      </div>

      {/* Resultados do Teste */}
      {testResults.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Resultados do Teste</h3>
          
          {/* Resumo */}
          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{testResults.length}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(r => r.isValid).length}
                  </div>
                  <div className="text-sm text-gray-600">Válidos</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(r => !r.isValid).length}
                  </div>
                  <div className="text-sm text-gray-600">Inválidos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Resultados */}
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getStatusColor(result.isValid)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.isValid)}
                    <span className="font-medium">{result.student}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.isValid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.isValid ? 'Válido' : 'Inválido'}
                  </span>
                </div>

                {result.isValid && result.data && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Acertos:</span> {result.data.acertos}
                    </div>
                    <div>
                      <span className="font-medium">Nota:</span> {result.data.nota}
                    </div>
                    <div>
                      <span className="font-medium">Proficiência:</span> {result.data.proficiencia}
                    </div>
                    <div>
                      <span className="font-medium">Classificação:</span> {result.data.classificacao}
                    </div>
                  </div>
                )}

                {!result.isValid && result.issues.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-sm">Problemas detectados:</span>
                    </div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {result.issues.map((issue, issueIndex) => (
                        <li key={issueIndex}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 