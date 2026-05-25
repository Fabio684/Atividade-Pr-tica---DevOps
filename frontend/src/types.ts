export type ViewName = "catalog" | "cart" | "payment" | "admin";
export type AuthMode = "login" | "register";

export interface ProductRating {
  rate?: number;
  count?: number;
}

export interface Product {
  id: number;
  title: string;
  price: number;
  category: string;
  image: string;
  description: string;
  rating?: ProductRating;
}

export interface CartItem {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
}

export interface LocalUser {
  name: string;
  email: string;
  password: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  clientId: string;
  productId: number;
  productTitle: string;
  productPrice: number;
  productImage: string;
  createdAt: string;
}

export interface ClientView extends Client {
  favorites: Product[];
  purchases: Purchase[];
}

export interface ProductOverride {
  title: string;
  price: number;
  category: string;
  image: string;
  description: string;
  ratingRate: number;
  ratingCount: number;
}

export interface PaymentState {
  product: Product;
  source: "catalog" | "cart";
  pixKey: string;
  payload: string;
}