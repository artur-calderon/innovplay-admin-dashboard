
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Student = {
  id: number;
  name: string;
  registeredAt: string;
};

// Sample data for students
const students: Student[] = [
  { id: 1, name: "Ana Silva", registeredAt: "2025-04-30 10:15" },
  { id: 2, name: "Bruno Santos", registeredAt: "2025-04-30 09:30" },
  { id: 3, name: "Carla Oliveira", registeredAt: "2025-04-29 14:45" },
  { id: 4, name: "Daniel Pereira", registeredAt: "2025-04-29 11:20" },
  { id: 5, name: "Eva Martins", registeredAt: "2025-04-28 16:05" },
];

export default function RecentStudents() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Últimos Alunos Cadastrados</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {students.map((student) => (
            <div key={student.id} className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">{student.name}</span>
              <span className="text-sm text-gray-500">{student.registeredAt}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
