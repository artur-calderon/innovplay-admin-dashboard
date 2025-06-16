import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Question, Subject } from "../types";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface QuestionBankProps {
    onClose: () => void;
    onSelect: (question: Question) => void;
    subjects: Subject[];
}

const QuestionBank = ({
    onClose,
    onSelect,
    subjects,
}: QuestionBankProps) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const { toast } = useToast();

    useEffect(() => {
        fetchQuestions();
    }, [selectedSubject]);

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const response = await api.get("/questions", {
                params: {
                    subject: selectedSubject,
                    search: searchTerm,
                },
            });
            setQuestions(response.data);
        } catch (error) {
            console.error("Erro ao buscar questões:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar as questões",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchQuestions();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Banco de Questões</h2>
                <Button variant="outline" onClick={onClose}>
                    Fechar
                </Button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-4">
                <div className="flex-1">
                    <Label htmlFor="search">Buscar</Label>
                    <Input
                        id="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por título ou enunciado..."
                    />
                </div>
                <div className="w-48">
                    <Label htmlFor="subject">Disciplina</Label>
                    <Select
                        value={selectedSubject}
                        onValueChange={setSelectedSubject}
                    >
                        <SelectTrigger id="subject">
                            <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">Todas</SelectItem>
                            {subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                    {subject.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end">
                    <Button type="submit" disabled={loading}>
                        {loading ? "Buscando..." : "Buscar"}
                    </Button>
                </div>
            </form>

            <div className="space-y-4">
                {questions.map((question) => (
                    <Card key={question.id}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">{question.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {question.text}
                                    </p>
                                    {question.options && (
                                        <div className="mt-2 space-y-1">
                                            {question.options.map((option, index) => (
                                                <div
                                                    key={index}
                                                    className="text-sm"
                                                >
                                                    {String.fromCharCode(65 + index)}. {option.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onSelect(question)}
                                >
                                    Selecionar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {!loading && questions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        Nenhuma questão encontrada
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuestionBank; 