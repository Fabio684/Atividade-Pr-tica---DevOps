import { randomUUID } from "node:crypto";
import type { Client, ClientRepository, Purchase } from "../types.js";

export class InMemoryRepository implements ClientRepository {
  private readonly clients = new Map<string, Client>();
  private readonly favorites = new Map<string, Set<number>>();
  private readonly purchases = new Map<string, Purchase>();

  async createClient(input: { name: string; email: string }): Promise<Client> {
    const now = new Date().toISOString();
    const client: Client = {
      id: randomUUID(),
      name: input.name,
      email: input.email.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    };

    this.clients.set(client.id, client);
    return client;
  }

  async listClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClientById(id: string): Promise<Client | null> {
    return this.clients.get(id) ?? null;
  }

  async getClientByEmail(email: string): Promise<Client | null> {
    const normalizedEmail = email.toLowerCase();
    const clients = Array.from(this.clients.values());
    return clients.find((client) => client.email === normalizedEmail) ?? null;
  }

  async updateClient(id: string, input: { name: string; email: string }): Promise<Client | null> {
    const existing = this.clients.get(id);
    if (!existing) {
      return null;
    }

    const updated: Client = {
      ...existing,
      name: input.name,
      email: input.email.toLowerCase(),
      updatedAt: new Date().toISOString(),
    };

    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    const deleted = this.clients.delete(id);
    this.favorites.delete(id);
    return deleted;
  }

  async addFavorite(clientId: string, productId: number): Promise<void> {
    const current = this.favorites.get(clientId) ?? new Set<number>();
    current.add(productId);
    this.favorites.set(clientId, current);
  }

  async removeFavorite(clientId: string, productId: number): Promise<boolean> {
    const current = this.favorites.get(clientId);
    if (!current) {
      return false;
    }

    const deleted = current.delete(productId);
    this.favorites.set(clientId, current);
    return deleted;
  }

  async hasFavorite(clientId: string, productId: number): Promise<boolean> {
    const current = this.favorites.get(clientId);
    return current?.has(productId) ?? false;
  }

  async listFavoriteIds(clientId: string): Promise<number[]> {
    const current = this.favorites.get(clientId);
    if (!current) {
      return [];
    }

    return Array.from(current.values());
  }

  async savePurchase(purchase: Omit<Purchase, "id" | "createdAt">): Promise<Purchase> {
    const created: Purchase = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...purchase,
    };

    this.purchases.set(created.id, created);
    return created;
  }

  async listPurchasesByClient(clientId: string): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter((purchase) => purchase.clientId === clientId);
  }
}
