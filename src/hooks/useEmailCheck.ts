import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

export function generateEmailFromName(name: string): string {
  if (!name || !name.trim()) return "";
  const words = name.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return "";
  if (words.length === 1) return `${words[0]}@afirmeplay.com.br`;
  const initials = words.map(w => w.charAt(0)).join("");
  return `${initials}@afirmeplay.com.br`;
}

export function generatePasswordFromName(name: string): string {
  if (!name || !name.trim()) return "";
  const firstName = name.trim().toLowerCase().split(/\s+/)[0];
  return `${firstName}@afirmeplay`;
}

interface UseEmailCheckResult {
  checkedEmail: string;
  isChecking: boolean;
  isAvailable: boolean | null;
}

export function useEmailCheck(name: string, enabled = true): UseEmailCheckResult {
  const [checkedEmail, setCheckedEmail] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCheckedEmail("");
      setIsAvailable(null);
      return;
    }

    const baseEmail = generateEmailFromName(name);

    if (!baseEmail) {
      setCheckedEmail("");
      setIsAvailable(null);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      setIsChecking(true);
      try {
        const { data } = await api.post<{
          disponivel: boolean;
          email: string;
          email_sugerido?: string;
        }>("/users/check-email", { email: baseEmail });

        if (data.disponivel) {
          setCheckedEmail(baseEmail);
          setIsAvailable(true);
        } else {
          setCheckedEmail(data.email_sugerido ?? baseEmail);
          setIsAvailable(false);
        }
      } catch {
        setCheckedEmail(baseEmail);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 600);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [name, enabled]);

  return { checkedEmail, isChecking, isAvailable };
}
