import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calculator, BookOpen, TrendingUp, Target } from "lucide-react";

// Tipos para a calculadora
type GradeLevel = "5" | "9";
type InputType = "nota" | "proficiencia";

interface ProficiencyLimits {
    portugues: { min: number; max: number };
    matematica: { min: number; max: number };
}

interface IdebResult {
    portugues: {
        nota: number;
        proficiencia: number;
    };
    matematica: {
        nota: number;
        proficiencia: number;
    };
    notaMedia: number;
    ideb: number;
}

// Limites de proficiência SAEB por ano escolar
const PROFICIENCY_LIMITS: Record<GradeLevel, ProficiencyLimits> = {
    "5": {
        portugues: { min: 49, max: 324 },
        matematica: { min: 60, max: 322 }
    },
    "9": {
        portugues: { min: 100, max: 400 },
        matematica: { min: 100, max: 400 }
    }
};

// Função para converter nota (0-10) para proficiência SAEB
const notaToProficiencia = (nota: number, limits: { min: number; max: number }): number => {
    return Math.round(limits.min + (nota / 10) * (limits.max - limits.min));
};

// Função para converter proficiência SAEB para nota (0-10)
const proficienciaToNota = (proficiencia: number, limits: { min: number; max: number }): number => {
    return Math.round(((proficiencia - limits.min) / (limits.max - limits.min)) * 10 * 10) / 10;
};

// Função para calcular nota média padronizada
const calcularNotaMedia = (notaPortugues: number, notaMatematica: number): number => {
    return Math.round(((notaPortugues + notaMatematica) / 2) * 10) / 10;
};

// Função para calcular IDEB
const calcularIdeb = (notaMedia: number, taxaAprovacao: number): number => {
    return Math.round(notaMedia * taxaAprovacao * 100) / 100;
};

export default function IdebCalculator() {
    const [gradeLevel, setGradeLevel] = useState<GradeLevel>("5");
    const [inputType, setInputType] = useState<InputType>("nota");
    const [portuguesValue, setPortuguesValue] = useState<string>("5.0");
    const [matematicaValue, setMatematicaValue] = useState<string>("5.0");
    const [taxaAprovacao, setTaxaAprovacao] = useState<number[]>([0.95]);

    // Obter limites de proficiência para o ano escolar selecionado
    const limits = PROFICIENCY_LIMITS[gradeLevel];

    // Calcular resultados usando useMemo para otimização
    const resultados = useMemo((): IdebResult => {
        const portuguesNum = parseFloat(portuguesValue) || 0;
        const matematicaNum = parseFloat(matematicaValue) || 0;
        const taxa = taxaAprovacao[0];

        let notaPortugues: number;
        let proficienciaPortugues: number;
        let notaMatematica: number;
        let proficienciaMatematica: number;

        if (inputType === "nota") {
            notaPortugues = Math.max(0, Math.min(10, portuguesNum));
            proficienciaPortugues = notaToProficiencia(notaPortugues, limits.portugues);
            notaMatematica = Math.max(0, Math.min(10, matematicaNum));
            proficienciaMatematica = notaToProficiencia(notaMatematica, limits.matematica);
        } else {
            proficienciaPortugues = Math.max(limits.portugues.min, Math.min(limits.portugues.max, portuguesNum));
            notaPortugues = proficienciaToNota(proficienciaPortugues, limits.portugues);
            proficienciaMatematica = Math.max(limits.matematica.min, Math.min(limits.matematica.max, matematicaNum));
            notaMatematica = proficienciaToNota(proficienciaMatematica, limits.matematica);
        }

        const notaMedia = calcularNotaMedia(notaPortugues, notaMatematica);
        const ideb = calcularIdeb(notaMedia, taxa);

        return {
            portugues: {
                nota: notaPortugues,
                proficiencia: proficienciaPortugues
            },
            matematica: {
                nota: notaMatematica,
                proficiencia: proficienciaMatematica
            },
            notaMedia,
            ideb
        };
    }, [gradeLevel, inputType, portuguesValue, matematicaValue, taxaAprovacao, limits]);

    // Função para obter cor do badge baseada no IDEB
    const getIdebColor = (ideb: number): string => {
        if (ideb >= 6.0) return "bg-green-100 text-green-800";
        if (ideb >= 5.0) return "bg-yellow-100 text-yellow-800";
        if (ideb >= 4.0) return "bg-orange-100 text-orange-800";
        return "bg-red-100 text-red-800";
    };

    // Função para obter descrição do IDEB
    const getIdebDescription = (ideb: number): string => {
        if (ideb >= 6.0) return "Excelente";
        if (ideb >= 5.0) return "Bom";
        if (ideb >= 4.0) return "Regular";
        return "Baixo";
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-blue-600" />
                    Calculadora SAEB/IDEB
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Calcule o Índice de Desenvolvimento da Educação Básica (IDEB) com base nas notas ou proficiências SAEB
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Configurações */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            Configurações
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Ano Escolar */}
                        <div className="space-y-2">
                            <Label htmlFor="grade-level">Ano Escolar</Label>
                            <Select value={gradeLevel} onValueChange={(value: GradeLevel) => setGradeLevel(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o ano escolar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="5">5º ano do Ensino Fundamental</SelectItem>
                                    <SelectItem value="9">9º ano do Ensino Fundamental</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Tipo de Entrada */}
                        <div className="space-y-2">
                            <Label htmlFor="input-type">Tipo de Entrada</Label>
                            <Select value={inputType} onValueChange={(value: InputType) => setInputType(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo de entrada" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="nota">Nota (0 a 10)</SelectItem>
                                    <SelectItem value="proficiencia">Proficiência SAEB</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Língua Portuguesa */}
                        <div className="space-y-2">
                            <Label htmlFor="portugues">
                                {inputType === "nota" ? "Nota de Língua Portuguesa" : "Proficiência SAEB - Língua Portuguesa"}
                            </Label>
                            <Input
                                id="portugues"
                                type="number"
                                step={inputType === "nota" ? "0.1" : "1"}
                                min={inputType === "nota" ? "0" : limits.portugues.min.toString()}
                                max={inputType === "nota" ? "10" : limits.portugues.max.toString()}
                                value={portuguesValue}
                                onChange={(e) => setPortuguesValue(e.target.value)}
                                placeholder={inputType === "nota" ? "Ex: 5.0" : `Ex: ${Math.round((limits.portugues.min + limits.portugues.max) / 2)}`}
                            />
                            <p className="text-xs text-gray-500">
                                {inputType === "nota"
                                    ? "Digite uma nota de 0 a 10"
                                    : `Faixa válida: ${limits.portugues.min} a ${limits.portugues.max}`
                                }
                            </p>
                        </div>

                        {/* Matemática */}
                        <div className="space-y-2">
                            <Label htmlFor="matematica">
                                {inputType === "nota" ? "Nota de Matemática" : "Proficiência SAEB - Matemática"}
                            </Label>
                            <Input
                                id="matematica"
                                type="number"
                                step={inputType === "nota" ? "0.1" : "1"}
                                min={inputType === "nota" ? "0" : limits.matematica.min.toString()}
                                max={inputType === "nota" ? "10" : limits.matematica.max.toString()}
                                value={matematicaValue}
                                onChange={(e) => setMatematicaValue(e.target.value)}
                                placeholder={inputType === "nota" ? "Ex: 5.0" : `Ex: ${Math.round((limits.matematica.min + limits.matematica.max) / 2)}`}
                            />
                            <p className="text-xs text-gray-500">
                                {inputType === "nota"
                                    ? "Digite uma nota de 0 a 10"
                                    : `Faixa válida: ${limits.matematica.min} a ${limits.matematica.max}`
                                }
                            </p>
                        </div>

                        {/* Taxa de Aprovação */}
                        <div className="space-y-2">
                            <Label htmlFor="taxa-aprovacao">Taxa de Aprovação: {(taxaAprovacao[0] * 100).toFixed(1)}%</Label>
                            <Slider
                                id="taxa-aprovacao"
                                value={taxaAprovacao}
                                onValueChange={setTaxaAprovacao}
                                max={1}
                                min={0}
                                step={0.01}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>0%</span>
                                <span>50%</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resultados */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            Resultados Calculados
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* IDEB Final */}
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">IDEB Final</div>
                            <div className="text-4xl font-bold text-blue-600 mt-2">{resultados.ideb.toFixed(2)}</div>
                            <Badge className={`mt-2 ${getIdebColor(resultados.ideb)}`}>
                                {getIdebDescription(resultados.ideb)}
                            </Badge>
                        </div>

                        {/* Nota Média */}
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <div className="text-lg font-semibold text-gray-700">Nota Média Padronizada</div>
                            <div className="text-3xl font-bold text-green-600 mt-1">{resultados.notaMedia.toFixed(1)}</div>
                        </div>

                        {/* Tabela de Valores */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                Valores Detalhados
                            </h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Disciplina</TableHead>
                                        <TableHead>Nota (0-10)</TableHead>
                                        <TableHead>Proficiência SAEB</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Língua Portuguesa</TableCell>
                                        <TableCell>{resultados.portugues.nota.toFixed(1)}</TableCell>
                                        <TableCell>{resultados.portugues.proficiencia}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Matemática</TableCell>
                                        <TableCell>{resultados.matematica.nota.toFixed(1)}</TableCell>
                                        <TableCell>{resultados.matematica.proficiencia}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        {/* Informações Adicionais */}
                        <div className="text-xs text-gray-500 space-y-1">
                            <p><strong>Fórmula IDEB:</strong> Nota Média Padronizada × Taxa de Aprovação</p>
                            <p><strong>Ano Escolar:</strong> {gradeLevel}º ano do Ensino Fundamental</p>
                            <p><strong>Taxa de Aprovação:</strong> {(taxaAprovacao[0] * 100).toFixed(1)}%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 