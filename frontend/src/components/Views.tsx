import { useMemo, useState } from "react";
import type { CartItem, ClientView, LocalUser, PaymentState, Product, ProductOverride } from "../types";
import { translateCategory } from "../lib/catalog";

interface CatalogSectionProps {
  products: Product[];
  cartIds: number[];
  loading: boolean;
  error: string;
  onToggleFavorite: (product: Product) => void;
  onBuy: (product: Product) => void;
}

export function CatalogSection({ products, cartIds, loading, error, onToggleFavorite, onBuy }: CatalogSectionProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).sort(), [products]);

  const filteredProducts = useMemo(() => {
    const search = query.trim().toLowerCase();
    return products.filter((product) => {
      const titleMatch = product.title.toLowerCase().includes(search);
      const categoryMatch = !category || product.category === category;
      return titleMatch && categoryMatch;
    });
  }, [category, products, query]);

  if (loading) {
    return <section className="panel-surface"><h2>Catálogo de produtos</h2><p className="muted">Carregando produtos...</p></section>;
  }

  return (
    <section className="panel-surface">
      <div className="section-head">
        <div>
          <h2>Catálogo de produtos</h2>
          <p className="muted">Busque, filtre e compre a partir da Fake Store API.</p>
        </div>
      </div>

      <div className="catalog-filters">
        <label>
          Pesquisar produto
          <input value={query} onChange={(event) => setQuery(event.target.value)} type="text" placeholder="Digite o nome do produto" />
        </label>
        <label>
          Categoria
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((item) => <option key={item} value={item}>{translateCategory(item)}</option>)}
          </select>
        </label>
      </div>

      {error ? <p className="message error-message">{error}</p> : null}

      <div className="catalog-grid">
        {filteredProducts.length ? filteredProducts.map((product) => {
          const inCart = cartIds.includes(product.id);

          return (
            <article key={product.id} className="catalog-card">
              <img src={product.image} alt={product.title} />
              <div className="catalog-title">{product.title}</div>
              <div className="catalog-category">{translateCategory(product.category)}</div>
              <div className="catalog-price">R$ {Number(product.price).toFixed(2)}</div>
              <div className="catalog-rating">{product.rating?.rate ? `⭐ ${product.rating.rate} (${product.rating.count})` : "Sem avaliação"}</div>
              <div className="catalog-actions">
                <button type="button" className={inCart ? "ghost-btn" : ""} disabled={inCart} onClick={() => onToggleFavorite(product)}>
                  {inCart ? "No carrinho" : "Favoritar"}
                </button>
                <button type="button" onClick={() => onBuy(product)}>Comprar</button>
              </div>
            </article>
          );
        }) : <p className="muted catalog-empty">Nenhum item encontrado para os filtros selecionados.</p>}
      </div>
    </section>
  );
}

interface CartSectionProps {
  items: CartItem[];
  onBack: () => void;
  onRemove: (productId: number) => void;
  onBuy: (product: CartItem) => void;
}

export function CartSection({ items, onBack, onRemove, onBuy }: CartSectionProps) {
  return (
    <section className="panel-surface">
      <div className="section-head">
        <div>
          <h2>Seu carrinho</h2>
          <p className="muted">Revise os itens salvos localmente antes de pagar.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onBack}>Voltar</button>
      </div>

      <ul className="cart-list">
        {items.length ? items.map((item) => (
          <li key={item.id} className="cart-item">
            <div className="cart-item-head">
              <img className="cart-item-thumb" src={item.image} alt={item.title} />
              <div className="cart-item-info">
                <strong>{item.title}</strong>
                <small>R$ {Number(item.price).toFixed(2)}</small>
              </div>
            </div>
            <div className="cart-item-actions">
              <button type="button" className="ghost-btn" onClick={() => onRemove(item.id)}>Excluir</button>
              <button type="button" onClick={() => onBuy(item)}>Comprar</button>
            </div>
          </li>
        )) : <li className="muted">Nenhum produto no carrinho.</li>}
      </ul>
    </section>
  );
}

interface PaymentSectionProps {
  payment: PaymentState | null;
  onCopy: () => void;
  onBack: () => void;
}

export function PaymentSection({ payment, onCopy, onBack }: PaymentSectionProps) {
  if (!payment) {
    return (
      <section className="panel-surface">
        <div className="section-head">
          <div>
            <h2>Pagamento via PIX</h2>
            <p className="muted">Selecione um produto para gerar o QR Code.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onBack}>Voltar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel-surface">
      <div className="section-head">
        <div>
          <h2>Pagamento via PIX</h2>
          <p className="muted">Produto: {payment.product.title} | Valor: R$ {Number(payment.product.price).toFixed(2)}</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onBack}>Voltar</button>
      </div>

      <div className="payment-box">
        <img className="payment-qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payment.payload)}`} alt="QR Code PIX" />
        <div className="payment-details">
          <label>
            Chave aleatória
            <input type="text" value={payment.pixKey} readOnly />
          </label>
          <button type="button" className="ghost-btn" onClick={onCopy}>Copiar chave</button>
          <p className="muted payment-source">Origem: {payment.source === "cart" ? "carrinho" : "catálogo"}</p>
        </div>
      </div>
    </section>
  );
}

interface ClientsSectionProps {
  clients: ClientView[];
  onDeleteClient: (clientId: string) => void;
  onEditClient: (client: ClientView) => void;
  onAddFavorite: (clientId: string, productId: number) => void;
  onRemoveFavorite: (clientId: string, productId: number) => void;
}

export function ClientsSection({ clients, onDeleteClient, onEditClient, onAddFavorite, onRemoveFavorite }: ClientsSectionProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <section className="panel-surface">
      <div className="section-head">
        <div>
          <h2>Clientes</h2>
          <p className="muted">CRUD sincronizado com o backend.</p>
        </div>
      </div>

      <div className="client-grid">
        {clients.map((client) => (
          <article key={client.id} className="client-card" data-client-name={client.name} data-client-email={client.email}>
            <div className="client-card-head">
              <div>
                <h3>{client.name}</h3>
                <p className="muted">{client.email}</p>
              </div>
              <span className="client-pill">{client.favorites.length} favoritos</span>
            </div>

            <div className="client-actions">
              <button type="button" className="ghost-btn" onClick={() => onEditClient(client)}>Editar</button>
              <button type="button" className="ghost-btn" onClick={() => onDeleteClient(client.id)}>Excluir</button>
            </div>

            <div className="client-favorite-form">
              <input
                type="number"
                min="1"
                placeholder="ID do produto"
                value={drafts[client.id] || ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [client.id]: event.target.value }))}
              />
              <button
                type="button"
                onClick={() => {
                  const value = Number(drafts[client.id]);
                  if (!Number.isInteger(value) || value <= 0) {
                    return;
                  }
                  onAddFavorite(client.id, value);
                  setDrafts((current) => ({ ...current, [client.id]: "" }));
                }}
              >
                Adicionar favorito
              </button>
            </div>

            <div className="favorite-list">
              {client.favorites.length ? client.favorites.map((favorite) => (
                <div key={favorite.id} className="favorite-item">
                  <img src={favorite.image} alt={favorite.title} />
                  <div>
                    <strong>{favorite.title}</strong>
                    <small>R$ {Number(favorite.price).toFixed(2)}</small>
                  </div>
                  <button type="button" className="ghost-btn" onClick={() => onRemoveFavorite(client.id, favorite.id)}>Remover</button>
                </div>
              )) : <p className="muted">Nenhum favorito cadastrado.</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

interface AdminSectionProps {
  users: LocalUser[];
  products: Product[];
  onBack: () => void;
  onDeleteUser: (index: number) => void;
  onSaveUser: (index: number, values: LocalUser) => void;
  onSaveProduct: (productId: number, values: ProductOverride) => void;
}

export function AdminSection({ users, products, onBack, onDeleteUser, onSaveUser, onSaveProduct }: AdminSectionProps) {
  return (
    <section className="panel-surface">
      <div className="section-head">
        <div>
          <h2>Painel administrativo</h2>
          <p className="muted">Gerencie usuários e sobrescreva dados de produtos.</p>
        </div>
        <button type="button" className="ghost-btn" onClick={onBack}>Voltar</button>
      </div>

      <div className="admin-block">
        <h3>Usuários</h3>
        <div className="admin-list">
          {users.map((user, index) => (
            <form
              key={`${user.email}-${index}`}
              className="admin-item"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const formData = new FormData(form);
                const nextUser = {
                  name: String(formData.get("name") || "").trim(),
                  email: String(formData.get("email") || "").trim().toLowerCase(),
                  password: String(formData.get("password") || "").trim(),
                };
                if (!nextUser.name || !nextUser.email || nextUser.password.length < 4) {
                  return;
                }
                onSaveUser(index, nextUser);
              }}
            >
              <label>
                Nome
                <input name="name" defaultValue={user.name} type="text" />
              </label>
              <label>
                E-mail
                <input name="email" defaultValue={user.email} type="email" />
              </label>
              <label>
                Senha
                <input name="password" defaultValue={user.password} type="password" minLength={4} />
              </label>
              <div className="admin-actions">
                <button type="submit">Salvar</button>
                <button type="button" className="ghost-btn" onClick={() => onDeleteUser(index)}>Excluir</button>
              </div>
            </form>
          ))}
        </div>
      </div>

      <div className="admin-block">
        <h3>Produtos</h3>
        <div className="admin-list">
          {products.map((product) => (
            <form
              key={product.id}
              className="admin-item"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const formData = new FormData(form);
                const nextProduct = {
                  title: String(formData.get("title") || "").trim(),
                  price: Number(formData.get("price") || 0),
                  category: String(formData.get("category") || "").trim(),
                  image: String(formData.get("image") || "").trim(),
                  description: String(formData.get("description") || "").trim(),
                  ratingRate: Number(formData.get("ratingRate") || 0),
                  ratingCount: Number(formData.get("ratingCount") || 0),
                };

                if (!nextProduct.title || !nextProduct.category || !nextProduct.image || !nextProduct.description) {
                  return;
                }

                onSaveProduct(product.id, nextProduct);
              }}
            >
              <label>
                Título
                <input name="title" defaultValue={product.title} type="text" />
              </label>
              <label>
                Preço
                <input name="price" defaultValue={product.price} type="number" step="0.01" min="0" />
              </label>
              <label>
                Categoria
                <input name="category" defaultValue={product.category} type="text" />
              </label>
              <label>
                Imagem
                <input name="image" defaultValue={product.image} type="url" />
              </label>
              <label>
                Descrição
                <textarea name="description" defaultValue={product.description} rows={3} />
              </label>
              <div className="grid-two">
                <label>
                  Rating
                  <input name="ratingRate" defaultValue={product.rating?.rate ?? 0} type="number" step="0.1" min="0" />
                </label>
                <label>
                  Contagem
                  <input name="ratingCount" defaultValue={product.rating?.count ?? 0} type="number" min="0" />
                </label>
              </div>
              <div className="admin-actions">
                <button type="submit">Salvar</button>
              </div>
            </form>
          ))}
        </div>
      </div>
    </section>
  );
}