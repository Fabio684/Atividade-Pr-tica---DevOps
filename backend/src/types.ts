export type Purchase = {
  id: string;
  clientId: string;
  productId: number;
  productTitle: string;
  productPrice: number;
  productImage: string;
  createdAt: string;
};
export type Client = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type FavoriteProduct = {
  id: number;
  title: string;
  image: string;
  price: number;
  review?: {
    rate?: number;
    count?: number;
  };
};

export interface ClientRepository {
  createClient(input: { name: string; email: string }): Promise<Client>;
  listClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
  getClientByEmail(email: string): Promise<Client | null>;
  updateClient(id: string, input: { name: string; email: string }): Promise<Client | null>;
  deleteClient(id: string): Promise<boolean>;
  addFavorite(clientId: string, productId: number): Promise<void>;
  removeFavorite(clientId: string, productId: number): Promise<boolean>;
  hasFavorite(clientId: string, productId: number): Promise<boolean>;
  listFavoriteIds(clientId: string): Promise<number[]>;
  savePurchase(purchase: Omit<Purchase, "id" | "createdAt">): Promise<Purchase>;
  listPurchasesByClient(clientId: string): Promise<Purchase[]>;
}
