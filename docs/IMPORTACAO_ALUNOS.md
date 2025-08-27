# 📚 Importação de Alunos em Massa

Este documento explica como usar a funcionalidade de importação em massa de alunos no sistema.

## 🎯 Visão Geral

A funcionalidade de importação em massa permite cadastrar múltiplos alunos de uma vez através de arquivos CSV ou Excel, economizando tempo e reduzindo erros de digitação.

## 📋 Colunas Obrigatórias

O arquivo de importação deve conter as seguintes colunas na ordem especificada:

| Coluna | Descrição | Exemplo | Obrigatório |
|--------|-----------|---------|-------------|
| `nome` | Nome completo do aluno | João Silva | ✅ |
| `email` | Email do aluno | joao.silva@email.com | ✅ |
| `senha` | Senha de acesso | 123456 | ✅ |
| `data_nascimento` | Data de nascimento | 15/03/2008 | ✅ |
| `matricula` | Número de matrícula | 2024001 | ✅ |
| `escola` | Nome da escola | Escola Municipal A | ✅ |
| `endereco_escola` | Endereço da escola | Rua das Flores 123 | ✅ |
| `estado_escola` | Estado da escola | SP | ✅ |
| `municipio_escola` | Município da escola | São Paulo | ✅ |
| `curso` | Nome do curso | Matemática | ✅ |
| `serie` | Série/ano escolar | 6º Ano | ✅ |
| `turma` | Nome da turma | Turma A | ✅ |

## 📁 Formatos Suportados

- **CSV** (.csv) - Arquivo de texto separado por vírgulas
- **Excel** (.xls) - Arquivo Excel 97-2003
- **Excel** (.xlsx) - Arquivo Excel moderno

## 🚀 Como Usar

### 1. Acessar a Funcionalidade

1. Navegue até a página de detalhes da escola
2. Clique na aba "Visão Geral"
3. Na seção "Gestão da Escola", clique no botão "Importar Alunos"

### 2. Baixar o Modelo

1. No modal de importação, você verá duas opções:
   - **Baixar CSV**: Arquivo CSV simples
   - **Baixar Excel (.xlsx)**: Arquivo Excel real que pode ser editado diretamente

2. Escolha o formato preferido e clique no botão correspondente

### 3. Preencher o Arquivo

1. **Para arquivo Excel (.xlsx)**: Abra diretamente no Excel, Google Sheets ou LibreOffice Calc
2. **Para arquivo CSV**: Abra no Excel, Google Sheets ou editor de texto
3. Preencha os dados dos alunos nas linhas abaixo do cabeçalho
4. **Importante**: Mantenha o cabeçalho exatamente como está
5. Salve o arquivo no formato desejado (CSV, XLS ou XLSX)

### 4. Fazer o Upload

1. Arraste e solte o arquivo na área de upload ou clique para selecionar
2. Verifique se o arquivo foi selecionado corretamente
3. Clique em "Enviar Arquivo"
4. Aguarde o processamento

### 5. Verificar Resultados

Após o upload, você verá:
- **Resumo**: Total de linhas, sucessos e erros
- **Alunos Criados**: Lista dos alunos importados com sucesso
- **Erros**: Detalhes de qualquer problema encontrado

## 📝 Exemplo de Arquivo

```csv
nome,email,senha,data_nascimento,matricula,escola,endereco_escola,estado_escola,municipio_escola,curso,serie,turma
João Silva,joao.silva@email.com,123456,15/03/2008,2024001,Escola Municipal A,Rua das Flores 123,SP,São Paulo,Matemática,6º Ano,Turma A
Maria Santos,maria.santos@email.com,123456,22/07/2008,2024002,Escola Municipal A,Rua das Flores 123,SP,São Paulo,Português,6º Ano,Turma A
```

## ⚠️ Regras e Validações

### Validações de Dados
- **Email**: Deve ser único no sistema
- **Matrícula**: Deve ser única na escola
- **Data de Nascimento**: Formato DD/MM/AAAA
- **Senha**: Mínimo de 6 caracteres

### Limitações
- **Tamanho do arquivo**: Máximo 10MB
- **Número de linhas**: Recomendado até 1000 alunos por upload
- **Formato de data**: Apenas DD/MM/AAAA

## 🔧 Solução de Problemas

### Erros Comuns

#### 1. "Formato não suportado"
- **Causa**: Arquivo com extensão incorreta
- **Solução**: Salve como CSV, XLS ou XLSX

#### 2. "Email já existe"
- **Causa**: Email duplicado no sistema
- **Solução**: Use emails únicos para cada aluno

#### 3. "Matrícula já existe"
- **Causa**: Matrícula duplicada na escola
- **Solução**: Use matrículas únicas para cada aluno

#### 4. "Data inválida"
- **Causa**: Formato de data incorreto
- **Solução**: Use formato DD/MM/AAAA

### Dicas para Evitar Erros

1. **Teste com poucos registros** primeiro
2. **Verifique o formato das datas** antes do upload
3. **Use emails únicos** para cada aluno
4. **Mantenha o cabeçalho** exatamente como no modelo
5. **Não deixe células vazias** nos campos obrigatórios

## 📊 Relatórios e Auditoria

Após cada importação, o sistema registra:
- Data e hora do upload
- Usuário que fez o upload
- Número de alunos criados
- Lista de erros encontrados
- Tempo de processamento

## 🆘 Suporte

Se encontrar problemas:

1. **Verifique os erros** exibidos no modal
2. **Consulte este documento** para soluções comuns
3. **Teste com um arquivo menor** para isolar o problema
4. **Entre em contato** com o suporte técnico se necessário

## 📈 Melhores Práticas

1. **Use o arquivo Excel (.xlsx)** para facilitar a edição e formatação
2. **Prepare os dados** em uma planilha antes da importação
3. **Valide os dados** antes do upload
4. **Faça backups** dos arquivos originais
5. **Teste a funcionalidade** com dados de exemplo
6. **Mantenha os modelos** atualizados com as últimas versões

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0  
**Autor**: Equipe de Desenvolvimento
