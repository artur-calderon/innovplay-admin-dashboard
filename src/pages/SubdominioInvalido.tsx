import { AlertCircle, Loader2 } from "lucide-react";
import LOGO_WHITE from "/AFIRME PLAY LOGO branco.png";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { getSubdomainFromHostname } from "@/lib/subdomain";

export default function SubdominioInvalido() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "invalid" | "valid">("checking");

  useEffect(() => {
    const hostname = window.location.hostname;
    const subdomain = getSubdomainFromHostname(hostname);

    const check = async () => {
      try {
        const { data } = await api.get<{ exists: boolean }>(
          `/subdomain/check?subdomain=${encodeURIComponent(subdomain)}`
        );
        if (data?.exists) {
          setStatus("valid");
          // Volta para a rota raiz para o fluxo normal (SubdomainCheck/Login/BaseRoute).
          navigate("/", { replace: true });
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("invalid");
      }
    };

    check();
  }, [navigate]);

  if (status === "checking") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#240046]">
        <div className="flex items-center gap-3 text-white/90">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Verificando subdomínio...</span>
        </div>
      </div>
    );
  }

  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const subdomain = getSubdomainFromHostname(hostname);

  return (
    <div
      data-auth-page="subdominio-invalido"
      className="min-h-screen w-full flex flex-col items-center justify-center fixed inset-0 z-50 bg-[#240046] p-6"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center">
        <img
          src={LOGO_WHITE}
          alt="Afirme Play"
          className="w-[200px] max-w-full h-auto mb-8"
        />
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Subdomínio não encontrado
        </h1>
        <p className="text-white/80 mb-2">
          O endereço <strong className="text-white">{subdomain || hostname}</strong> não está
          cadastrado. Verifique se você acessou o link correto da sua instituição.
        </p>
        <p className="text-sm text-white/60">
          Se o problema persistir, entre em contato com sua escola ou com o suporte Afirme Play.
        </p>
      </div>

      <p className="relative z-10 mt-12 text-xs text-white/50">
        © {new Date().getFullYear()} Afirme Play
      </p>
    </div>
  );
}
