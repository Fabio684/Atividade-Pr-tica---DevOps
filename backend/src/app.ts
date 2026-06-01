import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ClientRepository } from "./types.js";
import { fetchProductById } from "./fakeStore.js";

function resolveCorsOrigin() {
  if (typeof process !== "undefined" && process.env?.CORS_ORIGIN) {
    const configured = process.env.CORS_ORIGIN.trim();
    return Array.from(new Set([
      configured,
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ]));
  }

  return "*";
}

function parseClientPayload(body: unknown): { name: string; email: string } | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const maybe = body as { name?: unknown; email?: unknown };

  if (typeof maybe.name !== "string" || typeof maybe.email !== "string") {
    return null;
  }

  const name = maybe.name.trim();
  const email = maybe.email.trim().toLowerCase();

  if (!name || !email) {
    return null;
  }

  return { name, email };
}

function parseProductPayload(body: unknown): { productId: number } | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const maybe = body as { productId?: unknown };

  if (typeof maybe.productId !== "number" || !Number.isInteger(maybe.productId) || maybe.productId <= 0) {
    return null;
  }

  return { productId: maybe.productId };
}

function parsePurchasePayload(body: unknown): {
  productId: number;
  productTitle: string;
  productPrice: number;
  productImage: string;
} | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const maybe = body as {
    productId?: unknown;
    productTitle?: unknown;
    productPrice?: unknown;
    productImage?: unknown;
  };

  if (typeof maybe.productId !== "number" || !Number.isInteger(maybe.productId) || maybe.productId <= 0) {
    return null;
  }

  if (typeof maybe.productTitle !== "string" || !maybe.productTitle.trim()) {
    return null;
  }

  if (typeof maybe.productPrice !== "number" || maybe.productPrice < 0) {
    return null;
  }

  if (typeof maybe.productImage !== "string" || !maybe.productImage.trim()) {
    return null;
  }

  return {
    productId: maybe.productId,
    productTitle: maybe.productTitle.trim(),
    productPrice: maybe.productPrice,
    productImage: maybe.productImage.trim(),
  };
}

export function createApp(repository: ClientRepository) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: resolveCorsOrigin(),
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );

  app.get("/", (c) => c.json({
    status: "ok",
    service: "favorites-backend",
    endpoints: {
      health: "/health",
      clients: "/api/clients",
    },
  }));

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.post("/api/clients", async (c) => {
    const payload = parseClientPayload(await c.req.json().catch(() => null));

    if (!payload) {
      return c.json({ message: "Dados invalidos. Informe nome e e-mail." }, 400);
    }

    const emailInUse = await repository.getClientByEmail(payload.email);
    if (emailInUse) {
      return c.json({ message: "E-mail ja cadastrado." }, 409);
    }

    const client = await repository.createClient(payload);
    return c.json(client, 201);
  });

  app.get("/api/clients", async (c) => {
    const clients = await repository.listClients();
    return c.json(clients);
  });

  app.put("/api/clients/:id", async (c) => {
    const clientId = c.req.param("id");
    const payload = parseClientPayload(await c.req.json().catch(() => null));

    if (!payload) {
      return c.json({ message: "Dados invalidos. Informe nome e e-mail." }, 400);
    }

    const existing = await repository.getClientById(clientId);
    if (!existing) {
      return c.json({ message: "Cliente nao encontrado." }, 404);
    }

    const ownerByEmail = await repository.getClientByEmail(payload.email);
    if (ownerByEmail && ownerByEmail.id !== clientId) {
      return c.json({ message: "E-mail ja cadastrado." }, 409);
    }

    const updated = await repository.updateClient(clientId, payload);
    return c.json(updated);
  });

  app.delete("/api/clients/:id", async (c) => {
    const clientId = c.req.param("id");
    const deleted = await repository.deleteClient(clientId);

    if (!deleted) {
      return c.json({ message: "Cliente nao encontrado." }, 404);
    }

    return c.body(null, 204);
  });

  app.post("/api/clients/:id/favorites", async (c) => {
    const clientId = c.req.param("id");
    const payload = parseProductPayload(await c.req.json().catch(() => null));

    if (!payload) {
      return c.json({ message: "Dados invalidos. Informe productId inteiro e positivo." }, 400);
    }

    const client = await repository.getClientById(clientId);
    if (!client) {
      return c.json({ message: "Cliente nao encontrado." }, 404);
    }

    const product = await fetchProductById(payload.productId);
    if (!product) {
      return c.json({ message: "Produto nao encontrado na API externa." }, 404);
    }

    const alreadyFavorite = await repository.hasFavorite(clientId, payload.productId);
    if (alreadyFavorite) {
      return c.json({ message: "Produto ja favoritado para este cliente." }, 409);
    }

    await repository.addFavorite(clientId, payload.productId);
    return c.json(product, 201);
  });

  app.get("/api/clients/:id/favorites", async (c) => {
    const clientId = c.req.param("id");
    const client = await repository.getClientById(clientId);

    if (!client) {
      return c.json({ message: "Cliente nao encontrado." }, 404);
    }

    const favoriteIds = await repository.listFavoriteIds(clientId);
    const products = await Promise.all(favoriteIds.map((productId) => fetchProductById(productId)));
    return c.json(products.filter((product) => product !== null));
  });

  app.delete("/api/clients/:id/favorites/:productId", async (c) => {
    const clientId = c.req.param("id");
    const productIdRaw = c.req.param("productId");
    const productId = Number(productIdRaw);

    if (!Number.isInteger(productId) || productId <= 0) {
      return c.json({ message: "productId invalido." }, 400);
    }

    const client = await repository.getClientById(clientId);
    if (!client) {
      return c.json({ message: "Cliente nao encontrado." }, 404);
    }

    const removed = await repository.removeFavorite(clientId, productId);
    if (!removed) {
      return c.json({ message: "Favorito nao encontrado para este cliente." }, 404);
    }

    return c.body(null, 204);
  });

  app.post("/api/clients/:id/purchases", async (c) => {
    const clientId = c.req.param("id");
    const payload = parsePurchasePayload(await c.req.json().catch(() => null));

    if (!payload) {
      return c.json({ message: "Dados de compra invalidos." }, 400);
    }

    const client = await repository.getClientById(clientId);
    if (!client) {
      return c.json({ message: "Cliente nao encontrado." }, 404);
    }

    const purchase = await repository.savePurchase({
      clientId,
      productId: payload.productId,
      productTitle: payload.productTitle,
      productPrice: payload.productPrice,
      productImage: payload.productImage,
    });

    return c.json(purchase, 201);
  });

  app.get("/api/clients/:id/purchases", async (c) => {
    const clientId = c.req.param("id");
    const client = await repository.getClientById(clientId);

    if (!client) {
      return c.json({ message: "Cliente nao encontrado." }, 404);
    }

    const purchases = await repository.listPurchasesByClient(clientId);
    return c.json(purchases);
  });

  return app;
}
