import { AlertCircle } from "lucide-react";
import LOGO_WHITE from "/AFIRME PLAY LOGO branco.png";

export default function SubdominioInvalido() {
  const hostname = typeof window !== "undefined" ? window.location.hostname : "";
  const subdomain = hostname.split(".")[0] || hostname;

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
