import { useEffect, useMemo, useState } from "react";
import { AuthView } from "./components/AuthView";
import { Modal } from "./components/Modal";
import { Sidebar } from "./components/Sidebar";
import { AdminSection, CartSection, CatalogSection, ClientsSection, PaymentSection } from "./components/Views";
import { applyProductOverrides, fetchCatalogProducts } from "./lib/catalog";
import { addFavorite, buildSessionClientName, createClient, deleteClient, listClients, loadFavorites, normalizeApiBase, registerPurchase, removeFavorite, updateClient } from "./lib/api";
import { buildPixPayload, generateRandomPixKey } from "./lib/pix";
import { findLocalUserByEmail, firebaseLogin, firebaseLogout, firebaseRegister, getLocalUsers, initFirebaseAuth, isAdminCredential, saveLocalUsers, watchAuthState } from "./lib/auth";
import { readJson, readString, writeJson, writeString } from "./lib/storage";
import type { CartItem, ClientView, LocalUser, PaymentState, Product, ProductOverride, ViewName } from "./types";

const storageKeys = {
  apiBase: "favorites_api_base",
  session: "favorites_ui_session",
  adminSession: "favorites_ui_is_admin",
  cart: "favorites_ui_cart",
  overrides: "favorites_ui_product_overrides",
};

const isLocalRuntime = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const envApiBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || "");
const defaultApiBase = isLocalRuntime ? "http://localhost:3000" : envApiBase;
const firebaseAuth = initFirebaseAuth();

function isFirebaseConfigurationError(error: unknown): boolean {
  if (typeof error !== "object" || !error) {
    return false;
  }

  const maybeCode = "code" in error ? String((error as { code?: unknown }).code || "") : "";
  const maybeMessage = error instanceof Error ? error.message : "";
  return maybeCode === "auth/configuration-not-found" || maybeMessage.includes("auth/configuration-not-found");
}

async function loadClientViews(apiBase: string): Promise<ClientView[]> {
  const backendClients = await listClients(apiBase);
  return Promise.all(backendClients.map(async (client) => {
    const favorites = await loadFavorites(apiBase, client.id).catch(() => [] as Product[]);
    return {
      ...client,
      favorites,
      purchases: [],
    } satisfies ClientView;
  }));
}

export default function App() {
  const [message, setMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAdminSession, setIsAdminSession] = useState(false);
  const [apiBase, setApiBase] = useState(() => normalizeApiBase(readString(storageKeys.apiBase, defaultApiBase)));
  const [users, setUsers] = useState<LocalUser[]>(() => getLocalUsers());
  const [cartItems, setCartItems] = useState<CartItem[]>(() => readJson<CartItem[]>(storageKeys.cart, []));
  const [overrides, setOverrides] = useState<Record<string, ProductOverride>>(() => readJson<Record<string, ProductOverride>>(storageKeys.overrides, {}));
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<ClientView[]>([]);
  const [clientsError, setClientsError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [clientsLoading, setClientsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewName>("catalog");
  const [payment, setPayment] = useState<PaymentState | null>(null);
  const [editClient, setEditClient] = useState<ClientView | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);

  useEffect(() => {
    writeString(storageKeys.apiBase, apiBase);
  }, [apiBase]);

  useEffect(() => {
    writeJson(storageKeys.cart, cartItems);
  }, [cartItems]);

  useEffect(() => {
    writeJson(storageKeys.overrides, overrides);
  }, [overrides]);

  useEffect(() => {
    const unsubscribe = watchAuthState(firebaseAuth, (email) => {
      setSessionEmail(email);
      setIsAdminSession(false);

      if (email) {
        writeString(storageKeys.session, email);
        writeString(storageKeys.adminSession, "false");
        return;
      }

      writeString(storageKeys.session, "");
      writeString(storageKeys.adminSession, "false");
    });

    const savedSession = readString(storageKeys.session, "");
    const savedAdmin = readString(storageKeys.adminSession, "false") === "true";
    if (savedSession) {
      setSessionEmail(savedSession);
      setIsAdminSession(savedAdmin);
    }

    setAppReady(true);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setProductsLoading(true);
      setCatalogError("");
      try {
        const catalogProducts = await fetchCatalogProducts();
        setProducts(applyProductOverrides(catalogProducts, overrides));
      } catch (error) {
        setCatalogError(error instanceof Error ? error.message : "Erro ao carregar produtos.");
      } finally {
        setProductsLoading(false);
      }
    };

    void loadProducts();
  }, [overrides]);

  useEffect(() => {
    const loadData = async () => {
      if (!sessionEmail) {
        setClients([]);
        return;
      }

      if (!apiBase && !isLocalRuntime) {
        setClientsError("");
        setClients([]);
        return;
      }

      setClientsLoading(true);
      setClientsError("");

      try {
        setClients(await loadClientViews(apiBase));
      } catch (error) {
        setClientsError(error instanceof Error ? error.message : "Não foi possível conectar à API.");
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };

    void loadData();
  }, [apiBase, sessionEmail]);

  useEffect(() => {
    if (!sessionEmail || (!apiBase && !isLocalRuntime)) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadClientViews(apiBase)
        .then((clientViews) => setClients(clientViews))
        .catch(() => undefined);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [apiBase, sessionEmail]);

  const userName = useMemo(() => {
    if (!sessionEmail) {
      return "";
    }

    return users.find((user) => user.email.toLowerCase() === sessionEmail.toLowerCase())?.name || buildSessionClientName(sessionEmail);
  }, [sessionEmail, users]);

  const favoriteCount = useMemo(() => cartItems.length, [cartItems]);
  const cartIds = useMemo(() => cartItems.map((item) => item.id), [cartItems]);

  async function refreshClients() {
    if (!sessionEmail || (!apiBase && !isLocalRuntime)) {
      return;
    }

    try {
      setClientsLoading(true);
      setClients(await loadClientViews(apiBase));
    } catch (error) {
      setClientsError(error instanceof Error ? error.message : "Não foi possível conectar à API.");
    } finally {
      setClientsLoading(false);
    }
  }

  async function resolveSessionClientId(): Promise<string | null> {
    if (!sessionEmail || (!apiBase && !isLocalRuntime)) {
      return null;
    }

    const existing = clients.find((client) => client.email.toLowerCase() === sessionEmail.toLowerCase());
    if (existing) {
      return existing.id;
    }

    try {
      const created = await createClient(apiBase, {
        name: buildSessionClientName(sessionEmail),
        email: sessionEmail,
      });
      await refreshClients();
      return created.id;
    } catch {
      return null;
    }
  }

  function setSession(email: string, admin = false) {
    setSessionEmail(email);
    setIsAdminSession(admin);
    writeString(storageKeys.session, email);
    writeString(storageKeys.adminSession, String(admin));
    setActiveView("catalog");
  }

  async function handleLogin(input: { email: string; password: string; termsAccepted: boolean }) {
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();

    if (!email || password.length < 4) {
      setMessage("Informe e-mail e senha válidos.");
      return;
    }

    if (!input.termsAccepted) {
      setMessage("Leia e marque o termo de responsabilidade para entrar.");
      return;
    }

    setAuthBusy(true);
    setMessage("");

    try {
      let firebaseFallbackUsed = false;

      if (isAdminCredential(email, password)) {
        setSession(email, true);
        setMessage("Sessão iniciada com sucesso.");
        return;
      }

      if (firebaseAuth) {
        try {
          await firebaseLogin(firebaseAuth, email, password);
        } catch (error) {
          if (!isFirebaseConfigurationError(error)) {
            throw error;
          }

          firebaseFallbackUsed = true;
        }
      }

      if (!firebaseAuth || firebaseFallbackUsed) {
        const existingUser = findLocalUserByEmail(email);
        if (!existingUser || existingUser.password !== password) {
          if (firebaseFallbackUsed) {
            throw new Error("Firebase Auth não está configurado e não há usuário local com essas credenciais.");
          }

          throw new Error("Credenciais inválidas. Verifique seus dados.");
        }
      }

      setSession(email, false);
      setMessage(firebaseFallbackUsed ? "Sessão iniciada no modo local (Firebase indisponível)." : "Sessão iniciada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Credenciais inválidas. Verifique seus dados.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(input: { name: string; email: string; password: string }) {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password.trim();

    if (!name || !email || password.length < 4) {
      setMessage("Preencha os campos corretamente para criar a conta.");
      return;
    }

    setAuthBusy(true);
    setMessage("");

    try {
      let firebaseFallbackUsed = false;

      const existingClients = await listClients(apiBase).catch(() => [] as ClientView[]);
      if (existingClients.some((client) => client.email.toLowerCase() === email)) {
        throw new Error("Já existe uma conta com esse e-mail.");
      }

      let backendClientCreated = false;
      try {
        await createClient(apiBase, { name, email });
        backendClientCreated = true;
      } catch {
        backendClientCreated = false;
      }

      if (firebaseAuth) {
        try {
          await firebaseRegister(firebaseAuth, email, password, name);
          setSession(email, false);
          setMessage(backendClientCreated ? "Conta criada com sucesso!" : "Conta criada (apenas Firebase/local).");
          return;
        } catch (error) {
          if (!isFirebaseConfigurationError(error)) {
            throw error;
          }

          firebaseFallbackUsed = true;
        }
      }

      if (!backendClientCreated && !isLocalRuntime) {
        throw new Error("Não foi possível salvar no banco. Configure a URL da API e tente novamente.");
      }

      const currentUsers = getLocalUsers().filter((user) => user.email.toLowerCase() !== email);
      currentUsers.push({ name, email, password });
      saveLocalUsers(currentUsers);
      setUsers(currentUsers);
      setSession(email, false);
      if (firebaseFallbackUsed) {
        setMessage(backendClientCreated ? "Conta criada no modo local (Firebase indisponível)." : "Conta criada apenas localmente (Firebase e API indisponíveis).");
      } else {
        setMessage(backendClientCreated ? "Conta criada com sucesso!" : "Conta criada (apenas local).");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    if (firebaseAuth) {
      await firebaseLogout(firebaseAuth).catch(() => undefined);
    }

    setSessionEmail(null);
    setIsAdminSession(false);
    setActiveView("catalog");
    writeString(storageKeys.session, "");
    writeString(storageKeys.adminSession, "false");
  }

  function handleSaveApiBase() {
    setApiBase(normalizeApiBase(apiBase || defaultApiBase));
    setMessage("URL da API atualizada.");
  }

  async function handleToggleFavorite(product: Product) {
    const alreadyInCart = cartItems.some((item) => item.id === product.id);

    setCartItems((current) => {
      if (alreadyInCart) {
        return current.filter((item) => item.id !== product.id);
      }

      return [...current, {
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        category: product.category,
      }];
    });

    try {
      const clientId = await resolveSessionClientId();
      if (!clientId) {
        return;
      }

      if (alreadyInCart) {
        await removeFavorite(apiBase, clientId, product.id);
        setMessage("Item removido dos favoritos.");
      } else {
        await addFavorite(apiBase, clientId, product.id);
        setMessage("Item favoritado com sucesso.");
      }

      await refreshClients();
    } catch {
      setMessage("Não foi possível sincronizar o favorito no backend.");
    }
  }

  async function handleRemoveFavorite(productId: number) {
    setCartItems((current) => current.filter((item) => item.id !== productId));

    try {
      const clientId = await resolveSessionClientId();
      if (!clientId) {
        return;
      }

      await removeFavorite(apiBase, clientId, productId);
      setMessage("Item removido dos favoritos.");
      await refreshClients();
    } catch {
      setMessage("Não foi possível remover o favorito no backend.");
    }
  }

  async function handleBuy(product: Product | CartItem, source: "catalog" | "cart") {
    const pixKey = generateRandomPixKey();
    const payload = buildPixPayload({
      phoneKey: "+5588988191225",
      txid: pixKey,
      amount: Number(product.price).toFixed(2),
      description: product.title,
    });

    setPayment({
      product: product as Product,
      source,
      pixKey,
      payload,
    });
    setActiveView("payment");

    try {
      const clientId = await resolveSessionClientId();
      if (!clientId) {
        return;
      }

      await registerPurchase(apiBase, clientId, {
        productId: product.id,
        productTitle: product.title,
        productPrice: Number(product.price),
        productImage: product.image,
      });
      setMessage("Compra registrada com sucesso!");
      await refreshClients();
    } catch {
      setMessage("Não foi possível registrar a compra no backend.");
    }
  }

  function handleCopyPix() {
    if (!payment) {
      return;
    }

    void navigator.clipboard.writeText(payment.payload)
      .then(() => setMessage("Código PIX copiado."))
      .catch(() => setMessage("Não foi possível copiar o código PIX."));
  }

  function handleSaveUser(index: number, values: LocalUser) {
    const nextUsers = [...users];
    nextUsers[index] = values;
    saveLocalUsers(nextUsers);
    setUsers(nextUsers);
    setMessage("Usuário atualizado.");
  }

  function handleDeleteUser(index: number) {
    const nextUsers = users.filter((_, userIndex) => userIndex !== index);
    saveLocalUsers(nextUsers);
    setUsers(nextUsers);
    setMessage("Usuário excluído.");
  }

  function handleSaveProduct(productId: number, values: ProductOverride) {
    setOverrides((current) => ({ ...current, [String(productId)]: values }));
    setProducts((current) => current.map((product) => {
      if (product.id !== productId) {
        return product;
      }

      return {
        ...product,
        title: values.title,
        price: values.price,
        category: values.category,
        image: values.image,
        description: values.description,
        rating: { rate: values.ratingRate, count: values.ratingCount },
      };
    }));

    setCartItems((current) => current.map((item) => (item.id === productId ? {
      ...item,
      title: values.title,
      price: values.price,
      category: values.category,
      image: values.image,
    } : item)));
    setMessage("Produto atualizado.");
  }

  function handleDeleteClient(clientId: string) {
    void deleteClient(apiBase, clientId)
      .then(() => {
        setMessage("Cliente removido.");
        void refreshClients();
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Não foi possível remover o cliente."));
  }

  function handleEditClient(client: ClientView) {
    setEditClient(client);
  }

  function handleUpdateClient(values: { name: string; email: string }) {
    if (!editClient) {
      return;
    }

    void updateClient(apiBase, editClient.id, values)
      .then(() => {
        setEditClient(null);
        setMessage("Cliente atualizado com sucesso.");
        void refreshClients();
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o cliente."));
  }

  function handleAddFavorite(clientId: string, productId: number) {
    void addFavorite(apiBase, clientId, productId)
      .then(() => {
        setMessage("Favorito adicionado.");
        void refreshClients();
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Não foi possível adicionar o favorito."));
  }

  function handleRemoveClientFavorite(clientId: string, productId: number) {
    void removeFavorite(apiBase, clientId, productId)
      .then(() => {
        setMessage("Favorito removido.");
        void refreshClients();
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Não foi possível remover o favorito."));
  }

  if (!appReady) {
    return <main className="loading-view"><p>Carregando Favorites Hub...</p></main>;
  }

  if (!sessionEmail) {
    return (
      <>
        <AuthView
          busy={authBusy}
          message={message}
          onOpenTerms={() => setTermsOpen(true)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />

        {termsOpen ? (
          <Modal title="Termo de Responsabilidade" onClose={() => setTermsOpen(false)}>
            <div className="terms-content">
              <p>Ao acessar esta plataforma, você concorda em utilizar o sistema de forma ética e responsável.</p>
              <p>Você é responsável pelas ações realizadas com sua conta, incluindo alterações de dados e operações de compra.</p>
              <p>O uso indevido, tentativa de fraude ou manipulação maliciosa de informações poderá resultar em bloqueio de acesso.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setTermsOpen(false)}>Fechar</button>
            </div>
          </Modal>
        ) : null}
      </>
    );
  }

  return (
    <main className="layout">
      <Sidebar
        userName={userName}
        userEmail={sessionEmail}
        favoriteCount={favoriteCount}
        clientCount={clients.length}
        isAdmin={isAdminSession}
        apiBase={apiBase}
        onApiBaseChange={setApiBase}
        onSaveApiBase={handleSaveApiBase}
        onOpenCart={() => setActiveView("cart")}
        onOpenAdmin={() => setActiveView("admin")}
        onShowCatalog={() => setActiveView("catalog")}
        onLogout={() => void handleLogout()}
      />

      <section className="content">
        <header className="topbar panel-surface">
          <div className="topbar-title">
            <img src="/img/Gemini_Generated_Image_70988h70988h7098-removebg-preview.png" alt="Logo Favorites Hub" className="site-logo topbar-logo" />
            <div>
              <h1>Dashboard de Clientes e Favoritos</h1>
              <p className="muted">React + TypeScript + SASS, com integração ao backend existente.</p>
            </div>
          </div>
          <div className="topbar-actions">
            <span className="user-chip">{sessionEmail}</span>
            {isAdminSession ? <button type="button" className="ghost-btn" onClick={() => setActiveView("admin")}>⚙</button> : null}
            <button type="button" className="ghost-btn" onClick={() => void handleLogout()}>Sair</button>
          </div>
        </header>

        <div className="stack-grid">
          {activeView === "catalog" ? (
            <CatalogSection
              products={products}
              cartIds={cartIds}
              loading={productsLoading}
              error={catalogError}
              onToggleFavorite={handleToggleFavorite}
              onBuy={(product) => void handleBuy(product, "catalog")}
            />
          ) : null}

          {activeView === "cart" ? (
            <CartSection
              items={cartItems}
              onBack={() => setActiveView("catalog")}
              onRemove={(productId) => void handleRemoveFavorite(productId)}
              onBuy={(item) => void handleBuy(item, "cart")}
            />
          ) : null}

          {activeView === "payment" ? (
            <PaymentSection
              payment={payment}
              onCopy={handleCopyPix}
              onBack={() => setActiveView("catalog")}
            />
          ) : null}

          {activeView === "admin" && isAdminSession ? (
            <AdminSection
              users={users}
              products={products}
              onBack={() => setActiveView("catalog")}
              onDeleteUser={handleDeleteUser}
              onSaveUser={handleSaveUser}
              onSaveProduct={handleSaveProduct}
            />
          ) : null}

          <ClientsSection
            clients={clients}
            onDeleteClient={handleDeleteClient}
            onEditClient={handleEditClient}
            onAddFavorite={handleAddFavorite}
            onRemoveFavorite={handleRemoveClientFavorite}
          />

          <section className="panel-surface credits-panel">
            <h2>Criadores do Projeto</h2>
            <ul>
              <li>FÁBIO LEON BARBOSA TAVARES</li>
              <li>JOAB RANIEL RODRIGUES</li>
              <li>GUILHERME LOPES S. DA CRUZ</li>
              <li>ISAIAS LEVY TAVARES DA SILVA</li>
            </ul>
          </section>

          {clientsLoading ? <p className="muted">Sincronizando clientes...</p> : null}
          {clientsError ? <p className="message error-message">{clientsError}</p> : null}
        </div>
      </section>

      {editClient ? (
        <Modal title="Editar Cliente" onClose={() => setEditClient(null)}>
          <form className="stack-form" onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const name = String(formData.get("name") || "").trim();
            const email = String(formData.get("email") || "").trim().toLowerCase();
            if (!name || !email) {
              return;
            }
            handleUpdateClient({ name, email });
          }}>
            <label>
              Nome
              <input name="name" type="text" defaultValue={editClient.name} required />
            </label>
            <label>
              E-mail
              <input name="email" type="email" defaultValue={editClient.email} required />
            </label>
            <div className="modal-actions">
              <button type="button" className="ghost-btn" onClick={() => setEditClient(null)}>Cancelar</button>
              <button type="submit">Salvar alterações</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {message ? <div className="floating-message">{message}</div> : null}
    </main>
  );
}