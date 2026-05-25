import { getApps, initializeApp } from "firebase/app";
import { get, getDatabase, ref, remove, set, update, type Database } from "firebase/database";
import { FIREBASE_CONFIG } from "./auth";
import type { Client, Product, Purchase } from "../types";

function getFirebaseDb(): Database {
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function fetchProductById(productId: number): Promise<Product | null> {
  const response = await fetch(`https://fakestoreapi.com/products/${productId}`);
  if (!response.ok) {
    return null;
  }

  return (await response.json()) as Product;
}

export async function listClientsFromFirebase(): Promise<Client[]> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, "clients"));
  const raw = (snapshot.val() ?? {}) as Record<string, Client>;
  return Object.values(raw);
}

export async function createClientInFirebase(input: { name: string; email: string }): Promise<Client> {
  const db = getFirebaseDb();
  const id = crypto.randomUUID();
  const client: Client = {
    id,
    name: input.name,
    email: input.email.toLowerCase(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  await set(ref(db, `clients/${id}`), client);
  return client;
}

export async function updateClientInFirebase(id: string, input: { name: string; email: string }): Promise<Client> {
  const db = getFirebaseDb();
  const currentSnapshot = await get(ref(db, `clients/${id}`));
  const current = currentSnapshot.val() as Client | null;

  const updated: Client = {
    id,
    name: input.name,
    email: input.email.toLowerCase(),
    createdAt: current?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  await set(ref(db, `clients/${id}`), updated);
  return updated;
}

export async function deleteClientInFirebase(id: string): Promise<void> {
  const db = getFirebaseDb();
  await Promise.all([
    remove(ref(db, `clients/${id}`)),
    remove(ref(db, `favorites/${id}`)),
  ]);
}

export async function listFavoriteIdsFromFirebase(clientId: string): Promise<number[]> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, `favorites/${clientId}`));
  const raw = (snapshot.val() ?? {}) as Record<string, true>;

  return Object.keys(raw)
    .map((key) => Number(key))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export async function loadFavoritesFromFirebase(clientId: string): Promise<Product[]> {
  const favoriteIds = await listFavoriteIdsFromFirebase(clientId);
  const products = await Promise.all(favoriteIds.map((id) => fetchProductById(id)));
  return products.filter((product): product is Product => product !== null);
}

export async function addFavoriteInFirebase(clientId: string, productId: number): Promise<void> {
  const db = getFirebaseDb();
  await set(ref(db, `favorites/${clientId}/${productId}`), true);
}

export async function removeFavoriteInFirebase(clientId: string, productId: number): Promise<void> {
  const db = getFirebaseDb();
  await remove(ref(db, `favorites/${clientId}/${productId}`));
}

export async function registerPurchaseInFirebase(input: {
  clientId: string;
  productId: number;
  productTitle: string;
  productPrice: number;
  productImage: string;
}): Promise<Purchase> {
  const db = getFirebaseDb();
  const id = crypto.randomUUID();
  const purchase: Purchase = {
    id,
    createdAt: nowIso(),
    ...input,
  };

  await update(ref(db, `purchases/${id}`), purchase);
  return purchase;
}

export async function listPurchasesByClientFromFirebase(clientId: string): Promise<Purchase[]> {
  const db = getFirebaseDb();
  const snapshot = await get(ref(db, "purchases"));
  const raw = (snapshot.val() ?? {}) as Record<string, Purchase>;
  return Object.values(raw).filter((purchase) => purchase.clientId === clientId);
}