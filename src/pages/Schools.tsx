import { useState, useEffect } from "react";
import SchoolsTable from "@/components/schools/SchoolsTable";
import { useDataContext } from "@/context/dataContext";
import { Loader2 } from "lucide-react";

const Schools = () => {
  const { getEscolas } = useDataContext();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      setIsLoading(true);
      try {
        await getEscolas();
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchools();
  }, [getEscolas]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="container max-w-5xl mx-auto py-6">
        <SchoolsTable />
      </div>
    </>
  );
};

export default Schools;
