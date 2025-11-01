import React from 'react';
import type { CertificateTemplate } from '@/types/certificates';

interface CertificateTemplateProps {
  template: CertificateTemplate;
  studentName?: string;
  evaluationTitle?: string;
  grade?: number;
  className?: string;
}

export function CertificateTemplateComponent({
  template,
  studentName = 'Nome do Aluno',
  evaluationTitle = 'Avaliação',
  grade,
  className = ''
}: CertificateTemplateProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return new Date().toLocaleDateString('pt-BR');
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return new Date().toLocaleDateString('pt-BR');
    }
  };

  return (
    <div
      className={`certificate-template ${className}`}
      style={{
        backgroundColor: template.background_color || '#ffffff',
        color: template.text_color || '#000000',
        minHeight: '600px',
        padding: '60px',
        position: 'relative',
        border: `8px solid ${template.accent_color || '#1e40af'}`,
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
        fontFamily: 'serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: template.logo_url ? `url(${template.logo_url})` : 'none',
        backgroundSize: '200px',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        paddingTop: template.logo_url ? '180px' : '60px'
      }}
    >
      {/* Decorative border elements */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '60px',
          height: '60px',
          border: `3px solid ${template.accent_color || '#1e40af'}`,
          borderRight: 'none',
          borderBottom: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          border: `3px solid ${template.accent_color || '#1e40af'}`,
          borderLeft: 'none',
          borderBottom: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          width: '60px',
          height: '60px',
          border: `3px solid ${template.accent_color || '#1e40af'}`,
          borderRight: 'none',
          borderTop: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          border: `3px solid ${template.accent_color || '#1e40af'}`,
          borderLeft: 'none',
          borderTop: 'none'
        }}
      />

      {/* Main content */}
      <div
        style={{
          textAlign: 'center',
          maxWidth: '800px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '40px'
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            margin: 0,
            color: template.accent_color || '#1e40af',
            textTransform: 'uppercase',
            letterSpacing: '4px'
          }}
        >
          {template.title || 'Certificado'}
        </h1>

        {/* Main text content */}
        <div
          style={{
            fontSize: '18px',
            lineHeight: '1.8',
            color: template.text_color || '#000000',
            marginBottom: '20px'
          }}
          dangerouslySetInnerHTML={{ __html: template.text_content }}
        />

        {/* Student information */}
        {studentName && (
          <div style={{ marginTop: '40px', width: '100%' }}>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: template.accent_color || '#1e40af',
                marginBottom: '20px',
                borderBottom: `2px solid ${template.accent_color || '#1e40af'}`,
                paddingBottom: '10px',
                display: 'inline-block',
                minWidth: '400px'
              }}
            >
              {studentName}
            </div>
            <div style={{ fontSize: '16px', marginTop: '20px' }}>
              {evaluationTitle && (
                <p style={{ margin: '5px 0' }}>
                  <strong>Avaliação:</strong> {evaluationTitle}
                </p>
              )}
              {grade !== undefined && (
                <p style={{ margin: '5px 0' }}>
                  <strong>Nota:</strong> {grade.toFixed(1)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Date */}
        <div
          style={{
            marginTop: '60px',
            fontSize: '14px',
            color: template.text_color || '#000000',
            opacity: 0.7
          }}
        >
          Data de emissão: {formatDate(template.custom_date)}
        </div>

        {/* Signature */}
        {template.signature_url && (
          <div
            style={{
              marginTop: '80px',
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <img
              src={template.signature_url}
              alt="Assinatura"
              style={{
                maxWidth: '200px',
                maxHeight: '100px',
                objectFit: 'contain'
              }}
            />
            <div
              style={{
                borderTop: `2px solid ${template.text_color || '#000000'}`,
                width: '200px',
                marginTop: '10px',
                paddingTop: '10px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Diretor
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

