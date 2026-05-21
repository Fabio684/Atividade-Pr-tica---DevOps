import { randomUUID } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import type { Client, ClientRepository, Purchase } from "../types.js";

function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!databaseURL || !serviceAccountRaw) {
    throw new Error("Firebase nao configurado. Defina FIREBASE_DATABASE_URL e FIREBASE_SERVICE_ACCOUNT_JSON.");
  }

  const serviceAccount = JSON.parse(serviceAccountRaw) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
    databaseURL,
  });
}

export class FirebaseRepository implements ClientRepository {
  private readonly db = getDatabase(getFirebaseApp());
  private readonly clientsNode = "clients";
  private readonly legacyClientsNode = "atletas";
  private readonly migrationPromise: Promise<void>;

  constructor() {
    this.migrationPromise = this.migrateLegacyClients();
  }

  private clientPath(id?: string): string {
    return id ? `${this.clientsNode}/${id}` : this.clientsNode;
  }

  private async ensureMigration(): Promise<void> {
    await this.migrationPromise;
  }

  private async migrateLegacyClients(): Promise<void> {
    const [clientsSnapshot, legacySnapshot] = await Promise.all([
      this.db.ref(this.clientPath()).get(),
      this.db.ref(this.legacyClientsNode).get(),
    ]);

    const clientsRaw = (clientsSnapshot.val() ?? {}) as Record<string, Client>;
    const legacyRaw = (legacySnapshot.val() ?? {}) as Record<string, Client>;

    if (Object.keys(legacyRaw).length === 0) {
      return;
    }

    const updates: Record<string, Client> = {};
    for (const [legacyKey, legacyClient] of Object.entries(legacyRaw)) {
      const normalizedId = legacyClient?.id || legacyKey;
      if (clientsRaw[normalizedId]) {
        continue;
      }

      updates[normalizedId] = {
        ...legacyClient,
        id: normalizedId,
        email: String(legacyClient.email || "").toLowerCase(),
      };
    }

    if (Object.keys(updates).length > 0) {
      await this.db.ref(this.clientPath()).update(updates);
    }

    await this.db.ref(this.legacyClientsNode).remove();
  }

  async createClient(input: { name: string; email: string }): Promise<Client> {
    await this.ensureMigration();

    const now = new Date().toISOString();
    const client: Client = {
      id: randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    await this.db.ref(this.clientPath(client.id)).set(client);
    return client;
  }

  async listClients(): Promise<Client[]> {
    await this.ensureMigration();

    const snapshot = await this.db.ref(this.clientPath()).get();
    const raw = (snapshot.val() ?? {}) as Record<string, Client>;
    return Object.values(raw);
  }

  async getClientById(id: string): Promise<Client | null> {
    await this.ensureMigration();

    const snapshot = await this.db.ref(this.clientPath(id)).get();
    return (snapshot.val() as Client | null) ?? null;
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    await this.ensureMigration();

    const normalizedEmail = email.toLowerCase();
    const clients = await this.listClients();
    return clients.find((client) => client.email === normalizedEmail) ?? null;
  }

  async updateClient(id: string, input: { name: string; email: string }): Promise<Client | null> {
    await this.ensureMigration();

    const existing = await this.getClientById(id);
    if (!existing) {
      return null;
    }

    const updated: Client = {
      ...existing,
      name: input.name,
      email: input.email.toLowerCase(),
      updatedAt: new Date().toISOString(),
    };

    await this.db.ref(this.clientPath(id)).set(updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    await this.ensureMigration();

    const existing = await this.getClientById(id);
    if (!existing) {
      return false;
    }

    await Promise.all([
      this.db.ref(this.clientPath(id)).remove(),
      this.db.ref(`favorites/${id}`).remove(),
    ]);
    return true;
  }

  async addFavorite(clientId: string, productId: number): Promise<void> {
    await this.db.ref(`favorites/${clientId}/${productId}`).set(true);
  }

  async removeFavorite(clientId: string, productId: number): Promise<boolean> {
    const target = this.db.ref(`favorites/${clientId}/${productId}`);
    const snapshot = await target.get();

    if (!snapshot.exists()) {
      return false;
    }

    await target.remove();
    return true;
  }

  async hasFavorite(clientId: string, productId: number): Promise<boolean> {
    const snapshot = await this.db.ref(`favorites/${clientId}/${productId}`).get();
    return snapshot.exists();
  }

  async listFavoriteIds(clientId: string): Promise<number[]> {
    const snapshot = await this.db.ref(`favorites/${clientId}`).get();
    const raw = (snapshot.val() ?? {}) as Record<string, true>;
    return Object.keys(raw).map((key) => Number(key)).filter((value) => Number.isInteger(value));
  }

  async savePurchase(purchase: Omit<Purchase, "id" | "createdAt">): Promise<Purchase> {
    const now = new Date().toISOString();
    const fullPurchase: Purchase = {
      id: randomUUID(),
      createdAt: now,
      ...purchase,
    };

    await this.db.ref(`purchases/${fullPurchase.id}`).set(fullPurchase);
    return fullPurchase;
  }

  async listPurchasesByClient(clientId: string): Promise<Purchase[]> {
    const snapshot = await this.db.ref("purchases").orderByChild("clientId").equalTo(clientId).get();
    const raw = (snapshot.val() ?? {}) as Record<string, Purchase>;
    return Object.values(raw);
  }
}
