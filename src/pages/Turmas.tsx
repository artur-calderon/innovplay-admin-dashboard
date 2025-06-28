import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Edit, Trash2, Users } from "lucide-react";
import { useState } from "react";

export default function Turmas() {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual API calls
  const turmas = [
    { id: 1, nome: "1º Ano A", escola: "Escola Municipal João Silva", alunos: 25, professor: "Maria Santos" },
    { id: 2, nome: "2º Ano B", escola: "Escola Municipal João Silva", alunos: 28, professor: "José Costa" },
    { id: 3, nome: "3º Ano A", escola: "Escola Estadual Pedro Alvares", alunos: 30, professor: "Ana Lima" },
    { id: 4, nome: "4º Ano C", escola: "Escola Municipal João Silva", alunos: 22, professor: "Carlos Mendes" },
  ];

  const filteredTurmas = turmas.filter(turma =>
    turma.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    turma.escola.toLowerCase().includes(searchTerm.toLowerCase()) ||
    turma.professor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciar Turmas</h1>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar turmas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTurmas.map((turma) => (
          <Card key={turma.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">{turma.nome}</CardTitle>
              <div className="flex space-x-1">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{turma.escola}</p>
                <p className="text-sm">
                  <strong>Professor:</strong> {turma.professor}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{turma.alunos} alunos</span>
                  </div>
                  <Badge variant="secondary">{turma.nome.split(' ')[0]}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTurmas.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhuma turma encontrada.</p>
        </div>
      )}
    </div>
  );
} 