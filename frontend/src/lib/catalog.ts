import type { Product, ProductOverride } from "../types";

const CATEGORY_MAP: Record<string, string> = {
  "men's clothing": "Roupas masculinas",
  "women's clothing": "Roupas femininas",
  jewelery: "Joias",
  electronics: "Eletrônicos",
};

export function translateCategory(category: string): string {
  return CATEGORY_MAP[category] || category;
}

export function applyProductOverrides(products: Product[], overrides: Record<string, ProductOverride>): Product[] {
  return products.map((product) => {
    const override = overrides[String(product.id)];
    if (!override) {
      return product;
    }

    return {
      ...product,
      title: override.title,
      price: override.price,
      category: override.category,
      image: override.image,
      description: override.description,
      rating: {
        rate: override.ratingRate,
        count: override.ratingCount,
      },
    };
  });
}

export async function fetchCatalogProducts(): Promise<Product[]> {
  const response = await fetch("https://fakestoreapi.com/products");
  if (!response.ok) {
    throw new Error("Não foi possível carregar os produtos.");
  }

  return (await response.json()) as Product[];
}