import type { Client, Product, Purchase } from "../types";
import {
  addFavoriteInFirebase,
  createClientInFirebase,
  deleteClientInFirebase,
  listClientsFromFirebase,
  loadFavoritesFromFirebase,
  registerPurchaseInFirebase,
  removeFavoriteInFirebase,
  updateClientInFirebase,
} from "./firebaseData";

function shouldUseFirebaseFallback(baseUrl: string, error: unknown): boolean {
  if (!baseUrl) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("não foi possível conectar à api")
    || message.includes("nao foi possivel conectar")
    || message.includes("a api demorou para responder")
    || message.includes("failed to fetch")
    || message.includes("esperava json")
    || message.includes("conteúdo inválido")
    || message.includes("conteudo invalido")
  );
}

export async function requestJson<T>(baseUrl: string, path: string, options: RequestInit = {}): Promise<T> {
  const controller = options.signal ? null : new AbortController();
  const timeoutId = controller ? window.setTimeout(() => controller.abort(), 12000) : null;
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
      signal: options.signal || controller?.signal,
    });
  } catch (error) {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A API demorou para responder. Tente novamente em instantes.");
    }

    if (error instanceof TypeError) {
      throw new Error("Não foi possível conectar à API. Verifique sua conexão e a disponibilidade do backend.");
    }

    throw new Error("Falha inesperada ao conectar com a API.");
  }

  if (timeoutId) {
    window.clearTimeout(timeoutId);
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    if (isJson) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message || `Erro ao chamar ${path}`);
    }

    const payloadText = await response.text().catch(() => "");
    const preview = payloadText.trim().slice(0, 120);
    throw new Error(`A API retornou conteúdo inválido em ${path}. Verifique a URL base da API. (${preview || "sem payload"})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    const payloadText = await response.text().catch(() => "");
    const preview = payloadText.trim().slice(0, 120);
    throw new Error(`Esperava JSON em ${path}, mas recebi outro formato. Verifique a URL base da API. (${preview || "sem payload"})`);
  }

  return (await response.json()) as T;
}

export function buildSessionClientName(email: string): string {
  const prefix = email.split("@")[0] || "usuario";
  return prefix
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Usuario";
}

export function normalizeApiBase(value: string): string {
  return value.trim().replace(/\/$/, "");
}

export async function listClients(baseUrl: string): Promise<Client[]> {
  try {
    return await requestJson<Client[]>(baseUrl, "/api/clients");
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      return listClientsFromFirebase();
    }

    throw error;
  }
}

export async function createClient(baseUrl: string, input: { name: string; email: string }): Promise<Client> {
  try {
    return await requestJson<Client>(baseUrl, "/api/clients", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      return createClientInFirebase(input);
    }

    throw error;
  }
}

export async function updateClient(baseUrl: string, id: string, input: { name: string; email: string }): Promise<Client> {
  try {
    return await requestJson<Client>(baseUrl, `/api/clients/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      return updateClientInFirebase(id, input);
    }

    throw error;
  }
}

export async function deleteClient(baseUrl: string, id: string): Promise<void> {
  try {
    await requestJson<void>(baseUrl, `/api/clients/${id}`, { method: "DELETE" });
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      await deleteClientInFirebase(id);
      return;
    }

    throw error;
  }
}

export async function loadFavorites(baseUrl: string, clientId: string): Promise<Product[]> {
  try {
    return await requestJson<Product[]>(baseUrl, `/api/clients/${clientId}/favorites`);
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      return loadFavoritesFromFirebase(clientId);
    }

    throw error;
  }
}

export async function addFavorite(baseUrl: string, clientId: string, productId: number): Promise<void> {
  try {
    await requestJson<void>(baseUrl, `/api/clients/${clientId}/favorites`, {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      await addFavoriteInFirebase(clientId, productId);
      return;
    }

    throw error;
  }
}

export async function removeFavorite(baseUrl: string, clientId: string, productId: number): Promise<void> {
  try {
    await requestJson<void>(baseUrl, `/api/clients/${clientId}/favorites/${productId}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      await removeFavoriteInFirebase(clientId, productId);
      return;
    }

    throw error;
  }
}

export async function registerPurchase(baseUrl: string, clientId: string, input: {
  productId: number;
  productTitle: string;
  productPrice: number;
  productImage: string;
}): Promise<Purchase> {
  try {
    return await requestJson<Purchase>(baseUrl, `/api/clients/${clientId}/purchases`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (shouldUseFirebaseFallback(baseUrl, error)) {
      return registerPurchaseInFirebase({
        clientId,
        ...input,
      });
    }

    throw error;
  }
}