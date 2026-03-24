export type SubdomainMode = "standard" | "demo_suffix";

const DEMO_SUFFIX = "-demo";

function sanitizeMode(value: string | undefined): SubdomainMode {
  if (value === "demo_suffix") return "demo_suffix";
  return "standard";
}

export function getSubdomainMode(): SubdomainMode {
  return sanitizeMode(import.meta.env.SUBDOMAIN_MODE);
}

export function formatSlugForHost(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return "";
  if (getSubdomainMode() === "demo_suffix") {
    return `${normalized}${DEMO_SUFFIX}`;
  }
  return normalized;
}

export function normalizeSubdomainFromHost(rawSubdomain: string): string {
  const normalized = rawSubdomain.trim().toLowerCase();
  if (!normalized) return "";

  if (getSubdomainMode() === "demo_suffix" && normalized.endsWith(DEMO_SUFFIX)) {
    return normalized.slice(0, -DEMO_SUFFIX.length);
  }

  return normalized;
}

export function getSubdomainFromHostname(hostname: string): string {
  const firstPart = hostname.split(".")[0] ?? "";
  return normalizeSubdomainFromHost(firstPart);
}
