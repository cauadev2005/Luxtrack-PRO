export async function request(path, options = {}) {
  const { token, body, headers = {}, ...rest } = options;
  const isForm = body instanceof FormData;
  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...headers
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined
  });

  if (!response.ok) {
    let message = "Erro inesperado";
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function wsLocationsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/locations`;
}

export async function openMonthlyPdf(token, month) {
  const response = await fetch(`/api/reports/monthly.pdf?month=${month}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Nao foi possivel gerar o PDF");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}
