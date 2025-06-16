import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Question } from "../types";

interface QuestionPreviewProps {
    data: {
        title: string;
        text: string;
        secondStatement?: string;
        difficulty: string;
        value: string;
        solution: string;
        options: {
            text: string;
            isCorrect: boolean;
        }[];
        skills?: string;
        topics?: string;
    };
}

const QuestionPreview = ({ data }: QuestionPreviewProps) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{data.title}</h3>
                <div className="flex items-center gap-2">
                    <Badge variant="outline">{data.difficulty}</Badge>
                    <Badge variant="outline">{data.value} pontos</Badge>
                </div>
            </div>

            <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: data.text }} />
            </div>

            {data.secondStatement && (
                <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: data.secondStatement }} />
                </div>
            )}

            <div className="space-y-2">
                {data.options.map((option, index) => (
                    <div
                        key={index}
                        className={`p-3 rounded-lg border ${option.isCorrect ? "border-green-500 bg-green-50" : "border-gray-200"
                            }`}
                    >
                        <div className="flex items-start gap-2">
                            <span className="font-medium">{String.fromCharCode(65 + index)}.</span>
                            <div dangerouslySetInnerHTML={{ __html: option.text }} />
                        </div>
                    </div>
                ))}
            </div>

            <Card>
                <CardContent className="pt-6">
                    <h4 className="font-medium mb-2">Solução</h4>
                    <div className="prose max-w-none">
                        <div dangerouslySetInnerHTML={{ __html: data.solution }} />
                    </div>
                </CardContent>
            </Card>

            {(data.skills || data.topics) && (
                <div className="flex flex-wrap gap-2">
                    {data.skills?.split(",").map((skill, index) => (
                        <Badge key={`skill-${index}`} variant="secondary">
                            {skill.trim()}
                        </Badge>
                    ))}
                    {data.topics?.split(",").map((topic, index) => (
                        <Badge key={`topic-${index}`} variant="secondary">
                            {topic.trim()}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuestionPreview; 