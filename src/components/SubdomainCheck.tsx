import React, { useState, useEffect, Suspense } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { api } from "@/lib/api";

const Login = React.lazy(() => import("@/pages/auth/Login"));

/**
 * Extrai o subdomínio do hostname (ex.: jiparana.localhost:8080 → jiparana).
 */
function getSubdomainFromHost(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  return parts[0] ?? "";
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#240046]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
  </div>
);

interface SubdomainCheckResponse {
  exists: boolean;
}

export default function SubdomainCheck() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">("loading");

  useEffect(() => {
    if (user.id) return;

    const subdomain = getSubdomainFromHost();
    if (!subdomain) {
      setStatus("invalid");
      return;
    }

    const check = async () => {
      try {
        const { data } = await api.get<SubdomainCheckResponse>(
          `/subdomain/check?subdomain=${encodeURIComponent(subdomain)}`
        );
        setStatus(data?.exists ? "valid" : "invalid");
      } catch {
        setStatus("invalid");
      }
    };

    check();
  }, [user.id]);

  const baseRoute = user.role === "aluno" ? "/aluno" : "/app";
  if (user.id) return <Navigate to={baseRoute} replace />;

  if (status === "loading") return <LoadingSpinner />;
  if (status === "invalid") {
    navigate("/subdominio-invalido", { replace: true });
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Login key="login" />
    </Suspense>
  );
}
