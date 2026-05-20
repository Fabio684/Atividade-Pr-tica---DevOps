import type { FavoriteProduct } from "./types.js";

const BASE_URL = "https://fakestoreapi.com/products";

type FakeStoreProduct = {
  id: number;
  title: string;
  price: number;
  image: string;
  rating?: {
    rate?: number;
    count?: number;
  };
};

export async function fetchProductById(productId: number): Promise<FavoriteProduct | null> {
  const response = await fetch(`${BASE_URL}/${productId}`);

  if (!response.ok) {
    return null;
  }

  const product = (await response.json()) as FakeStoreProduct;

  if (!product?.id) {
    return null;
  }

  return {
    id: product.id,
    title: product.title,
    image: product.image,
    price: product.price,
    review: product.rating
      ? {
          rate: product.rating.rate,
          count: product.rating.count,
        }
      : undefined,
  };
}
