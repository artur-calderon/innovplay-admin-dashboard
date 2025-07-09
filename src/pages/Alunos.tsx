import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDataContext } from "@/context/dataContext";

export default function Alunos() {
  const [searchTerm, setSearchTerm] = useState("");
  const { getEscolas, escolas } = useDataContext();

  useEffect(() => {
    getEscolas();
  }, [getEscolas]);

  const filteredEscolas = escolas.filter((escola) =>
    escola.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    escola.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    escola.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Selecione uma escola para ver os alunos</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar Escolas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredEscolas.length > 0 ? (
          filteredEscolas.map((escola) => (
            <Card key={escola.id} className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-base md:text-lg">{escola.name}</CardTitle>
                <CardDescription>
                  {escola.domain} | {escola.address}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Link to={`/app/alunos/${escola.id}`}>
                  <Button className="w-full sm:w-auto">
                    Ver Alunos
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            {searchTerm ? "Nenhuma escola encontrada com os critérios de busca." : "Você não está cadastrado(a) em nenhuma escola."}
          </div>
        )}
      </div>
    </div>
  );
}