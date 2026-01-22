import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Upload, Palette, Type, Calendar, Image as ImageIcon } from 'lucide-react';
import { CertificateTemplateComponent } from './CertificateTemplate';
import type { CertificateTemplate } from '@/types/certificates';
import { useToast } from '@/hooks/use-toast';

interface CertificateCustomizerProps {
  evaluationId: string;
  initialTemplate?: CertificateTemplate;
  onSave: (template: CertificateTemplate) => void;
  onPreview?: (template: CertificateTemplate) => void;
}

export function CertificateCustomizer({
  evaluationId,
  initialTemplate,
  onSave,
  onPreview
}: CertificateCustomizerProps) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<CertificateTemplate>({
    evaluation_id: evaluationId,
    title: initialTemplate?.title || 'Certificado de Excelência',
    text_content: initialTemplate?.text_content || '<p>Certificamos que <strong>{{nome_aluno}}</strong> obteve excelente desempenho na avaliação, demonstrando dedicação e conhecimento.</p>',
    background_color: initialTemplate?.background_color || '#ffffff',
    text_color: initialTemplate?.text_color || '#000000',
    accent_color: initialTemplate?.accent_color || '#1e40af',
    logo_url: initialTemplate?.logo_url,
    signature_url: initialTemplate?.signature_url,
    custom_date: initialTemplate?.custom_date || new Date().toISOString().split('T')[0],
    font_size: initialTemplate?.font_size || 'medium'
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: template.text_content,
    onUpdate: ({ editor }) => {
      setTemplate(prev => ({
        ...prev,
        text_content: editor.getHTML()
      }));
    },
  });

  const handleColorChange = (field: 'background_color' | 'text_color' | 'accent_color', color: string) => {
    setTemplate(prev => ({ ...prev, [field]: color }));
  };

  const handleImageUpload = (field: 'logo_url' | 'signature_url', file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setTemplate(prev => ({ ...prev, [field]: base64String }));
      toast({
        title: 'Imagem carregada',
        description: 'A imagem foi carregada com sucesso.',
      });
    };
    reader.onerror = () => {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar a imagem.',
        variant: 'destructive',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave(template);
    toast({
      title: 'Template salvo',
      description: 'O template do certificado foi salvo com sucesso.',
    });
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(template);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">
            <Type className="h-4 w-4 mr-2" />
            Conteúdo
          </TabsTrigger>
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Cores
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            Imagens
          </TabsTrigger>
          <TabsTrigger value="preview">
            <ImageIcon className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conteúdo do Certificado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Certificado</Label>
                <Input
                  id="title"
                  value={template.title || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Certificado de Excelência"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-content">Texto Principal</Label>
                <div className="border rounded-md p-4 min-h-[200px]">
                  {editor && <EditorContent editor={editor} />}
                </div>
                <p className="text-sm text-muted-foreground">
                  Use <strong>{'{{nome_aluno}}'}</strong> para inserir o nome do aluno dinamicamente.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="font-size">Tamanho do Texto</Label>
                <Select
                  value={template.font_size || 'medium'}
                  onValueChange={(value: 'small' | 'medium' | 'large' | 'extra-large') => 
                    setTemplate(prev => ({ ...prev, font_size: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Pequeno</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                    <SelectItem value="extra-large">Extra Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data de Emissão</Label>
                <Input
                  id="date"
                  type="date"
                  value={template.custom_date || ''}
                  onChange={(e) => setTemplate(prev => ({ ...prev, custom_date: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personalização de Cores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="background-color">Cor de Fundo</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="background-color"
                    type="color"
                    value={template.background_color}
                    onChange={(e) => handleColorChange('background_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={template.background_color}
                    onChange={(e) => handleColorChange('background_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-color">Cor do Texto</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="text-color"
                    type="color"
                    value={template.text_color}
                    onChange={(e) => handleColorChange('text_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={template.text_color}
                    onChange={(e) => handleColorChange('text_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-color">Cor de Destaque</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="accent-color"
                    type="color"
                    value={template.accent_color}
                    onChange={(e) => handleColorChange('accent_color', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={template.accent_color}
                    onChange={(e) => handleColorChange('accent_color', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Imagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logo">Logo da Escola</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('logo_url', file);
                    }}
                    className="flex-1"
                  />
                  {template.logo_url && (
                    <img
                      src={template.logo_url}
                      alt="Logo"
                      className="h-20 w-20 object-contain border rounded"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signature">Assinatura</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="signature"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload('signature_url', file);
                    }}
                    className="flex-1"
                  />
                  {template.signature_url && (
                    <img
                      src={template.signature_url}
                      alt="Assinatura"
                      className="h-20 w-40 object-contain border rounded"
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Preview do Certificado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-4 rounded-lg overflow-auto">
                <CertificateTemplateComponent
                  template={template}
                  studentName="Nome do Aluno"
                  evaluationTitle="Avaliação Exemplo"
                  grade={8.5}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={handlePreview}>
          Visualizar
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Template
        </Button>
      </div>
    </div>
  );
}

