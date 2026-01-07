import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AnswerSheetConfig, StudentAnswerSheet, QRCodeData } from '@/types/answer-sheet';
import { generateQRCode } from '@/services/answerSheetPdfService';

interface AnswerSheetCardProps {
  student: StudentAnswerSheet;
  config: AnswerSheetConfig;
}

export function AnswerSheetCard({ student, config }: AnswerSheetCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      const qrCodeData: QRCodeData = {
        aluno_id: student.id,
        escola_id: config.escola_id,
        turma_id: config.turma_id,
        prova_titulo: config.prova_titulo,
        data_geracao: config.data_geracao
      };
      const url = await generateQRCode(qrCodeData);
      setQrCodeUrl(url);
    };
    generateQR();
  }, [student, config]);

  const options = ['A', 'B', 'C', 'D'];
  const questionsPerColumn = 10;
  const totalColumns = Math.ceil(config.total_questoes / questionsPerColumn);

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white p-8 print:p-8">
      {/* Cabeçalho */}
      <div className="relative border-b-2 border-gray-800 pb-4 mb-4">
        <h1 className="text-xl font-bold text-center mb-4">CARTÃO RESPOSTA</h1>
        
        {/* QR Code */}
        {qrCodeUrl && (
          <div className="absolute top-0 right-0">
            <img src={qrCodeUrl} alt="QR Code" className="w-24 h-24" />
            <p className="text-[8px] text-center mt-1">QR Code:</p>
          </div>
        )}

        {/* Informações do aluno */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold">NOME COMPLETO:</span>
            <span className="flex-1 border-b border-gray-600 uppercase">{student.name}</span>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">ESTADO:</span>
              <span className="uppercase">{config.estado || 'ALAGOAS'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">MUNICÍPIO:</span>
              <span className="uppercase">{config.municipio}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-bold">ESCOLA:</span>
            <span className="flex-1 border-b border-gray-600 uppercase text-xs">{config.escola_nome}</span>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">TURMA:</span>
              <span className="uppercase">{config.turma_nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">PROVA:</span>
              <span className="uppercase">{config.prova_titulo}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="mb-4">
        <div className="bg-purple-700 text-white text-center py-2 font-bold text-sm">
          INSTRUÇÕES PARA O ALUNO
        </div>
        <div className="text-xs space-y-1 mt-2 px-2">
          <p>• Preencha seu nome e a data de nascimento.</p>
          <p>• Cada questão terá SOMENTE UMA resposta correta portanto seu cartão-resposta.</p>
          <p>• Tenha muita atenção ao marcar as alternativas.</p>
          <p>• As respostas rasuradas ou com dupla marcação não serão válidas para contagem.</p>
          <p>• Para as marcações nesse CARTÃO-RESPOSTA, preencha os círculos completamente, utilizando caneta esferográfica de tinta preta</p>
          <p className="ml-3">(demarcada em material transparente) conforme a ilustração:</p>
        </div>

        {/* Exemplos de marcação */}
        <div className="flex justify-center gap-8 mt-3 mb-2">
          <div className="text-center">
            <div className="w-6 h-6 rounded-full bg-black mx-auto"></div>
            <span className="text-[10px] font-semibold">CORRETO</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 rounded-full border-2 border-black mx-auto relative">
              <div className="absolute inset-0 flex items-center justify-center text-xl">×</div>
            </div>
            <span className="text-[10px] font-semibold">INCORRETO</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 rounded-full border-2 border-black mx-auto relative">
              <div className="w-3 h-3 rounded-full bg-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
            </div>
            <span className="text-[10px] font-semibold">INCORRETO</span>
          </div>
          <div className="text-center">
            <div className="w-6 h-6 rounded-full border-2 border-black mx-auto relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-4 h-0.5 bg-black rotate-45"></div>
                <div className="w-4 h-0.5 bg-black -rotate-45 absolute"></div>
              </div>
            </div>
            <span className="text-[10px] font-semibold">INCORRETO</span>
          </div>
        </div>
      </div>

      {/* Bloco de Atenção */}
      <div className="mb-4 border border-gray-300">
        <div className="bg-purple-700 text-white text-center py-1.5 font-bold text-xs">
          ATENÇÃO: BLOCO EXCLUSIVO PARA USO DO APLICADOR
        </div>
        <div className="p-2 space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-black"></div>
            <span>1. Aluno ausente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-black"></div>
            <span>2. Aluno com deficiência indicada no Censo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-black"></div>
            <span>3. Aluno com atendimento especializado que utilizou tempo adicional</span>
          </div>
        </div>
      </div>

      {/* Grid de Respostas */}
      <div className="border-2 border-gray-800">
        <div className="bg-purple-700 text-white text-center py-1.5 font-bold text-sm">
          BLOCO 01
        </div>
        
        <div className="p-4">
          <div className={`grid gap-x-8 gap-y-3`} style={{ gridTemplateColumns: `repeat(${totalColumns}, 1fr)` }}>
            {Array.from({ length: config.total_questoes }, (_, i) => i + 1).map((questionNumber) => (
              <div key={questionNumber} className="flex items-center gap-1">
                <span className="font-bold text-xs w-6">{questionNumber}.</span>
                <div className="flex gap-2">
                  {options.map((option) => (
                    <div key={option} className="flex flex-col items-center">
                      <span className="text-[9px] font-semibold mb-0.5">{option}</span>
                      <div className="w-5 h-5 rounded-full border-2 border-black"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="mt-8 flex justify-center">
        <div className="text-center">
          <div className="w-80 border-b-2 border-gray-800 mb-1"></div>
          <span className="text-xs">Assinatura do participante:</span>
        </div>
      </div>
    </Card>
  );
}


