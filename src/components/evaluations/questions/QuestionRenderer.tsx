import React from 'react';
import './QuestionRenderer.css';

interface QuestionRendererProps {
  /** Texto já limpo por cleanLegacyText (sem hard-breaks no meio da frase). */
  rawText: string;
}

/**
 * Interpreta texto legado (plain text) em blocos semânticos: título, parágrafo, poema, fonte.
 * Usado quando o enunciado não é HTML (ex.: colado de PDF como texto puro).
 */
export function QuestionRenderer({ rawText }: QuestionRendererProps) {
  const cleaned = (rawText || '').trim();
  if (!cleaned) return null;

  const blocks = cleaned.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length === 0) return null;

  return (
    <div className="question-container">
      {blocks.map((block, index) => {
        const text = block;

        // Título: todo em maiúsculas e relativamente curto
        if (text === text.toUpperCase() && text.length < 150) {
          return (
            <h3 key={index} className="q-title">
              {text}
            </h3>
          );
        }

        // Fonte/autor: último bloco, curto, contém vírgula ou "Disponível em:"
        if (
          index === blocks.length - 1 &&
          text.length < 100 &&
          (text.includes(',') || text.includes('Disponível em:'))
        ) {
          return (
            <p key={index} className="q-source">
              {text}
            </p>
          );
        }

        // Poema/verso: ainda tem quebras de linha simples (versos intencionais)
        if (/\n/.test(text)) {
          return (
            <p key={index} className="q-poem">
              {text}
            </p>
          );
        }

        // Parágrafo normal
        return (
          <p key={index} className="q-paragraph">
            {text}
          </p>
        );
      })}
    </div>
  );
}

export default QuestionRenderer;
