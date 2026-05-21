// --- Catálogo de Produtos ---
const catalogContainer = document.getElementById("catalogContainer");
const itemSearch = document.getElementById("itemSearch");
const itemCategory = document.getElementById("itemCategory");
let catalogProducts = [];
let cartItems = [];

const categoryMap = {
  "men's clothing": "Roupas masculinas",
  "women's clothing": "Roupas femininas",
  "jewelery": "Joias",
  electronics: "Eletronicos",
};

function traduzirCategoria(category) {
  return categoryMap[category] || category;
}

async function fetchCatalogProducts() {
  catalogContainer.innerHTML = "<span>Carregando produtos...</span>";
  try {
    const res = await fetch("https://fakestoreapi.com/products");
    const products = await res.json();
    catalogProducts = applyProductOverrides(products);
    renderCategoryOptions();
    renderCatalog();
    renderAdminProducts();
  } catch (e) {
    catalogContainer.innerHTML = `<span style='color:#c1121f'>Erro ao carregar produtos.</span>`;
  }
}

function renderCategoryOptions() {
  if (!itemCategory) {
    return;
  }

  const categories = Array.from(new Set(catalogProducts.map((product) => product.category))).sort();
  itemCategory.innerHTML = '<option value="">Todas as categorias</option>' +
    categories.map((category) => `<option value="${escapeHtml(category)}">${traduzirCategoria(category)}</option>`).join("");
}

function isInCart(productId) {
  return cartItems.some((item) => item.id === productId);
}

function getFilteredProducts() {
  const query = (itemSearch?.value || "").trim().toLowerCase();
  const category = itemCategory?.value || "";

  return catalogProducts.filter((product) => {
    const titleMatch = product.title.toLowerCase().includes(query);
    const categoryMatch = !category || product.category === category;
    return titleMatch && categoryMatch;
  });
}

function renderCatalog() {
  if (!catalogProducts.length) {
    catalogContainer.innerHTML = "Nenhum produto encontrado.";
    return;
  }

  const filteredProducts = getFilteredProducts();
  if (!filteredProducts.length) {
    catalogContainer.innerHTML = "Nenhum item encontrado para os filtros selecionados.";
    return;
  }

  catalogContainer.innerHTML = filteredProducts.map(prod => {
    const inCart = isInCart(prod.id);
    return `
      <div class="catalog-card">
        <img src="${escapeHtml(prod.image)}" alt="${escapeHtml(prod.title)}" />
        <div class="catalog-title">${escapeHtml(prod.title)}</div>
        <div class="catalog-category">${traduzirCategoria(prod.category)}</div>
        <div class="catalog-price">R$ ${Number(prod.price).toFixed(2)}</div>
        <div class="catalog-rating">${prod.rating?.rate ? `⭐ ${prod.rating.rate} (${prod.rating.count})` : "Sem avaliação"}</div>
        <div class="catalog-actions">
          <button data-action="toggle-favorite" data-product-id="${prod.id}" ${inCart ? 'disabled class="ghost-btn"' : ''}>
            ${inCart ? "No carrinho" : "Favoritar"}
          </button>
          <button data-action="buy-item" data-product-id="${prod.id}">Comprar</button>
        </div>
      </div>
    `;
  }).join("");
}

function saveCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
}

function renderSidebarFavorites() {
  sidebarFavoriteCount.textContent = String(cartItems.length);
  // Não mostra mais os produtos na sidebar, só o contador
  sidebarFavoriteList.innerHTML = '<li class="muted">Clique no carrinho para ver os produtos.</li>';
}

// Página do carrinho
const cartPageSection = document.getElementById("cartPageSection");
const cartPageList = document.getElementById("cartPageList");
const openCartPageBtn = document.getElementById("openCartPageBtn");
const closeCartPageBtn = document.getElementById("closeCartPageBtn");
const paymentPageSection = document.getElementById("paymentPageSection");
const paymentProductText = document.getElementById("paymentProductText");
const paymentQrImage = document.getElementById("paymentQrImage");
const paymentPixKey = document.getElementById("paymentPixKey");
const copyPixKeyBtn = document.getElementById("copyPixKeyBtn");
const closePaymentPageBtn = document.getElementById("closePaymentPageBtn");
const adminPageSection = document.getElementById("adminPageSection");
const openAdminPageBtn = document.getElementById("openAdminPageBtn");
const closeAdminPageBtn = document.getElementById("closeAdminPageBtn");
const adminUsersList = document.getElementById("adminUsersList");
const adminProductsList = document.getElementById("adminProductsList");
const catalogSection = document.getElementById("catalogSection");
let paymentSource = "catalog";
let paymentPixPayload = "";

function hidePrimarySections() {
  catalogSection?.classList.add("hidden");
  cartPageSection?.classList.add("hidden");
  paymentPageSection?.classList.add("hidden");
  adminPageSection?.classList.add("hidden");
}

function showCatalogSection() {
  hidePrimarySections();
  catalogSection?.classList.remove("hidden");
}

function renderCartPage() {
  if (!cartPageList) return;
  if (!cartItems.length) {
    cartPageList.innerHTML = '<li class="muted">Nenhum produto no carrinho.</li>';
    return;
  }
  cartPageList.innerHTML = cartItems.map((item) => `
    <li>
      <div class="cart-item-head">
        <img class="cart-item-thumb" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
        <div class="cart-item-info">
          <strong>${escapeHtml(item.title)}</strong>
          <small>R$ ${Number(item.price).toFixed(2)}</small>
        </div>
      </div>
      <div class="cart-item-actions">
        <button class="ghost-btn" data-action="remove-cart-item" data-product-id="${item.id}">Excluir</button>
        <button data-action="buy-cart-item" data-product-id="${item.id}">Comprar</button>
      </div>
    </li>
  `).join("");
}

if (openCartPageBtn) {
  openCartPageBtn.addEventListener("click", () => {
    hidePrimarySections();
    if (cartPageSection) cartPageSection.classList.remove("hidden");
    renderCartPage();
  });
}

if (closeCartPageBtn) {
  closeCartPageBtn.addEventListener("click", () => {
    showCatalogSection();
  });
}

if (cartPageList) {
  cartPageList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.action;
    const productId = Number(button.dataset.productId);
    const product = cartItems.find((item) => item.id === productId);
    if (!product) return;
    if (action === "remove-cart-item") {
      removeFromFavorites(productId);
      renderCartPage();
    }
    if (action === "buy-cart-item") {
      showPaymentPage(product, "cart");
    }
  });
}

function addToFavorites(product) {
  if (isInCart(product.id)) {
    return;
  }

  cartItems.push({
    id: product.id,
    title: product.title,
    price: product.price,
    image: product.image,
    category: product.category,
  });
  saveCart();
  renderSidebarFavorites();
  renderCatalog();
  void syncFavoriteToBackend(product.id);
}

function removeFromFavorites(productId) {
  cartItems = cartItems.filter((item) => item.id !== productId);
  saveCart();
  renderSidebarFavorites();
  renderCatalog();
  void syncFavoriteRemovalToBackend(productId);
}

function generateRandomPixKey() {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "TX";
  for (let i = 0; i < 23; i += 1) {
    key += charset[Math.floor(Math.random() * charset.length)];
  }
  return key;
}

function pixField(id, value) {
  const size = String(value.length).padStart(2, "0");
  return `${id}${size}${value}`;
}

function sanitizePixText(text, maxLen) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPixPayload({ phoneKey, txid, amount, description }) {
  const merchantName = sanitizePixText("FAVORITES HUB", 25);
  const merchantCity = sanitizePixText("FORTALEZA", 15);
  const desc = sanitizePixText(description || "PAGAMENTO", 40);

  let merchantAccount = "";
  merchantAccount += pixField("00", "br.gov.bcb.pix");
  merchantAccount += pixField("01", phoneKey);
  if (desc) {
    merchantAccount += pixField("02", desc);
  }

  let payload = "";
  payload += pixField("00", "01");
  payload += pixField("26", merchantAccount);
  payload += pixField("52", "0000");
  payload += pixField("53", "986");
  payload += pixField("54", amount);
  payload += pixField("58", "BR");
  payload += pixField("59", merchantName);
  payload += pixField("60", merchantCity);
  payload += pixField("62", pixField("05", txid));
  payload += "6304";
  payload += crc16(payload);

  return payload;
}

async function showPaymentPage(product, source = "catalog") {
  paymentSource = source;

  hidePrimarySections();
  if (paymentPageSection) {
    paymentPageSection.classList.remove("hidden");
  }

  const pixKey = generateRandomPixKey();
  const price = Number(product.price).toFixed(2);
  const phonePixKey = "+5588988191225";
  const payload = buildPixPayload({
    phoneKey: phonePixKey,
    txid: pixKey,
    amount: price,
    description: product.title,
  });
  paymentPixPayload = payload;

  if (paymentProductText) {
    paymentProductText.textContent = `Produto: ${product.title} | Valor: R$ ${price}`;
  }
  if (paymentPixKey) {
    paymentPixKey.value = pixKey;
  }
  if (paymentQrImage) {
    paymentQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`;
  }

  // --- Registrar compra no backend ---
  try {
    const clientId = await resolveSessionClientId();
    if (!clientId) {
      return;
    }

    await request(`/api/clients/${clientId}/purchases`, {
      method: "POST",
      body: JSON.stringify({
        productId: product.id,
        productTitle: product.title,
        productPrice: Number(product.price),
        productImage: product.image,
      }),
    });
    showMessage("Compra registrada com sucesso!");
  } catch (e) {
    showMessage("Não foi possível registrar a compra no backend.", true);
  }
}

function closePaymentPage() {
  if (paymentPageSection) {
    paymentPageSection.classList.add("hidden");
  }

  if (paymentSource === "cart") {
    if (cartPageSection) {
      cartPageSection.classList.remove("hidden");
    }
    return;
  }

  showCatalogSection();
}

function buyProduct(product) {
  showPaymentPage(product, "catalog");
}

catalogContainer.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const productId = Number(button.dataset.productId);
  const product = catalogProducts.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  if (action === "toggle-favorite") {
    if (isInCart(productId)) {
      removeFromFavorites(productId);
      showMessage("Item removido dos favoritos.");
      return;
    }

    addToFavorites(product);
    showMessage("Item favoritado com sucesso.");
    return;
  }

  if (action === "buy-item") {
    buyProduct(product);
  }
});

if (itemSearch) {
  itemSearch.addEventListener("input", renderCatalog);
}

if (itemCategory) {
  itemCategory.addEventListener("change", renderCatalog);
}

if (closePaymentPageBtn) {
  closePaymentPageBtn.addEventListener("click", closePaymentPage);
}

if (copyPixKeyBtn) {
  copyPixKeyBtn.addEventListener("click", async () => {
    if (!paymentPixPayload) {
      return;
    }

    try {
      await navigator.clipboard.writeText(paymentPixPayload);
      showMessage("Codigo PIX copiado.");
    } catch (_error) {
      showMessage("Nao foi possivel copiar o codigo PIX.", true);
    }
  });
}
// --- Fim catálogo ---
const apiStorageKey = "favorites_api_base";
const sessionStorageKey = "favorites_ui_session";
const usersStorageKey = "favorites_ui_users";
const cartStorageKey = "favorites_ui_cart";
const adminSessionKey = "favorites_ui_is_admin";
const productOverridesKey = "favorites_ui_product_overrides";
const ADMIN_EMAIL = "leonfabio161@gmail.com";
const ADMIN_PASSWORD = "leon123";

let apiBase = localStorage.getItem(apiStorageKey) || "http://localhost:3000";
let favoriteCountMap = new Map();
let favoritePreviewMap = new Map();
let firebaseAuth = null;
let sessionClientCache = { email: null, id: null };
let clientsRefreshTimer = null;
let isLoadingClients = false;
let hasPendingClientsLoad = false;

const CLIENTS_REFRESH_INTERVAL_MS = 7000;

const firebaseConfig = {
  apiKey: "AIzaSyDs7ChLl5aNbZBxHuF0z5YTEAWJ_Tn-cvw",
  authDomain: "devops-57d46.firebaseapp.com",
  databaseURL: "https://devops-57d46-default-rtdb.firebaseio.com",
  projectId: "devops-57d46",
  storageBucket: "devops-57d46.firebasestorage.app",
  messagingSenderId: "658371538608",
  appId: "1:658371538608:web:c6a25eb6d5ae678923d575",
};

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showLoginButton = document.getElementById("showLogin");
const showRegisterButton = document.getElementById("showRegister");
const sessionUser = document.getElementById("sessionUser");
const logoutButton = document.getElementById("logoutButton");
const loginTermsAccepted = document.getElementById("loginTermsAccepted");
const openTermsBtn = document.getElementById("openTermsBtn");
const termsModal = document.getElementById("termsModal");
const closeTermsBtn = document.getElementById("closeTermsBtn");

const apiInput = document.getElementById("apiBase");
const saveApiBaseButton = document.getElementById("saveApiBase");
const clientsContainer = document.getElementById("clientsContainer");
const message = document.getElementById("message");
const authMessage = document.getElementById("authMessage");
const globalError = document.getElementById("globalError");
const totalClients = document.getElementById("totalClients");
const totalFavorites = document.getElementById("totalFavorites");
const sidebarUserName = document.getElementById("sidebarUserName");
const sidebarUserEmail = document.getElementById("sidebarUserEmail");
const sidebarFavoriteCount = document.getElementById("sidebarFavoriteCount");
const sidebarFavoriteList = document.getElementById("sidebarFavoriteList");

const editModal = document.getElementById("editModal");
const editClientForm = document.getElementById("editClientForm");
const cancelEditButton = document.getElementById("cancelEdit");
const editClientId = document.getElementById("editClientId");
const editName = document.getElementById("editName");
const editEmail = document.getElementById("editEmail");

apiInput.value = apiBase;

function initFirebaseAuth() {
  if (!window.firebase) {
    return;
  }

  try {
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
    }
    firebaseAuth = window.firebase.auth();
  } catch (_error) {
    firebaseAuth = null;
  }
}

initFirebaseAuth();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(text, isError = false) {
  const target = !authView.classList.contains("hidden") ? authMessage : message;
  if (!target) {
    return;
  }

  target.textContent = text;
  target.style.color = isError ? "#c1121f" : "#475569";

  if (target !== message && message) {
    message.textContent = "";
  }

  if (target !== authMessage && authMessage) {
    authMessage.textContent = "";
  }
}

function showGlobalError(text) {
  globalError.textContent = text;
  globalError.style.display = text ? "block" : "none";
}


function getUsers() {
  return JSON.parse(localStorage.getItem(usersStorageKey) || "[]");
}

async function getRemoteUsers() {
  try {
    const res = await fetch(`${apiBase}/api/clients`);
    if (res.ok) {
      return await res.json();
    }
  } catch (_error) {
    // API indisponivel: nao usar fallback local para evitar falso positivo de duplicidade.
  }

  return [];
}

function saveUsers(users) {
  localStorage.setItem(usersStorageKey, JSON.stringify(users));
}

function getProductOverrides() {
  return JSON.parse(localStorage.getItem(productOverridesKey) || "{}");
}

function saveProductOverrides(overrides) {
  localStorage.setItem(productOverridesKey, JSON.stringify(overrides));
}

function applyProductOverrides(products) {
  const overrides = getProductOverrides();
  return products.map((product) => {
    const override = overrides[String(product.id)];
    if (!override) {
      return product;
    }

    const rate = Number(override.ratingRate);
    const count = Number(override.ratingCount);

    return {
      ...product,
      title: override.title || product.title,
      price: Number(override.price || product.price),
      description: override.description || product.description,
      category: override.category || product.category,
      image: override.image || product.image,
      rating: {
        rate: Number.isFinite(rate) ? rate : (product.rating?.rate || 0),
        count: Number.isFinite(count) ? count : (product.rating?.count || 0),
      },
    };
  });
}

function updateProductOverride(productId, payload) {
  const overrides = getProductOverrides();
  overrides[String(productId)] = payload;
  saveProductOverrides(overrides);
}

function findUserByEmail(email) {
  const users = getUsers();
  return users.find((user) => user.email === email);
}

function isAdminCredential(email, password) {
  return email === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}

function isAdminSession() {
  return localStorage.getItem(adminSessionKey) === "1";
}

function setAdminAccess(enabled) {
  if (enabled) {
    localStorage.setItem(adminSessionKey, "1");
  } else {
    localStorage.removeItem(adminSessionKey);
  }

  if (openAdminPageBtn) {
    openAdminPageBtn.classList.toggle("hidden", !enabled);
  }
}

function renderAdminUsers() {
  if (!adminUsersList) {
    return;
  }

  const users = getUsers();
  if (!users.length) {
    adminUsersList.innerHTML = '<div class="admin-item">Nenhum usuário local cadastrado.</div>';
    return;
  }

  adminUsersList.innerHTML = users.map((user, index) => `
    <div class="admin-item" data-user-index="${index}">
      <div class="admin-item-row">
        <input data-user-field="name" value="${escapeHtml(user.name || "")}" placeholder="Nome" />
        <input data-user-field="email" value="${escapeHtml(user.email || "")}" placeholder="E-mail" />
        <input data-user-field="password" value="${escapeHtml(user.password || "")}" placeholder="Senha" />
        <button type="button" class="danger" data-admin-action="delete-user" data-user-index="${index}">Excluir</button>
      </div>
      <button type="button" data-admin-action="save-user" data-user-index="${index}">Salvar usuário</button>
    </div>
  `).join("");
}

function renderAdminProducts() {
  if (!adminProductsList) {
    return;
  }

  if (!catalogProducts.length) {
    adminProductsList.innerHTML = '<div class="admin-item">Carregando produtos...</div>';
    return;
  }

  adminProductsList.innerHTML = catalogProducts.map((product) => `
    <div class="admin-item" data-product-id="${product.id}">
      <div class="admin-product-grid">
        <input data-product-field="title" class="full" value="${escapeHtml(product.title)}" placeholder="Nome do produto" />
        <input data-product-field="price" type="number" min="0" step="0.01" value="${Number(product.price).toFixed(2)}" placeholder="Preco" />
        <input data-product-field="category" value="${escapeHtml(product.category || "")}" placeholder="Categoria" />
        <input data-product-field="image" class="full" value="${escapeHtml(product.image || "")}" placeholder="URL da imagem" />
        <textarea data-product-field="description" class="full" placeholder="Descricao">${escapeHtml(product.description || "")}</textarea>
        <input data-product-field="ratingRate" type="number" min="0" step="0.1" value="${Number(product.rating?.rate || 0)}" placeholder="Nota" />
        <input data-product-field="ratingCount" type="number" min="0" step="1" value="${Number(product.rating?.count || 0)}" placeholder="Qtd avaliacoes" />
        <button type="button" data-admin-action="save-product" data-product-id="${product.id}">Salvar produto</button>
      </div>
    </div>
  `).join("");
}

function switchAuthMode(mode) {
  const isLogin = mode === "login";
  loginForm.classList.toggle("hidden", !isLogin);
  registerForm.classList.toggle("hidden", isLogin);
  showLoginButton.classList.toggle("active", isLogin);
  showRegisterButton.classList.toggle("active", !isLogin);
  showLoginButton.setAttribute("aria-selected", String(isLogin));
  showRegisterButton.setAttribute("aria-selected", String(!isLogin));
  if (loginTermsAccepted && !isLogin) {
    loginTermsAccepted.checked = false;
  }
  showMessage("");
}

function updateSidebarProfile(email) {
  const user = findUserByEmail(email);
  const fallbackName = (email || "").split("@")[0] || "Usuario";
  sidebarUserName.textContent = user?.name || fallbackName;
  sidebarUserEmail.textContent = email || "-";
}

function setSession(email, isAdmin = false) {
  localStorage.setItem(sessionStorageKey, email);
  sessionClientCache = { email: null, id: null };
  setAdminAccess(isAdmin);
  sessionUser.textContent = email;
  updateSidebarProfile(email);
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  showGlobalError("");
  startClientsAutoRefresh();
}

function clearSession() {
  localStorage.removeItem(sessionStorageKey);
  sessionClientCache = { email: null, id: null };
  stopClientsAutoRefresh();
  setAdminAccess(false);
  favoriteCountMap = new Map();
  favoritePreviewMap = new Map();
  sidebarUserName.textContent = "-";
  sidebarUserEmail.textContent = "-";
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
  showMessage("");
  showGlobalError("");
}

function stopClientsAutoRefresh() {
  if (clientsRefreshTimer) {
    window.clearInterval(clientsRefreshTimer);
    clientsRefreshTimer = null;
  }
}

function shouldAutoRefreshClients() {
  return Boolean(localStorage.getItem(sessionStorageKey)) && !document.hidden;
}

function startClientsAutoRefresh() {
  stopClientsAutoRefresh();

  if (!shouldAutoRefreshClients()) {
    return;
  }

  clientsRefreshTimer = window.setInterval(() => {
    void loadClients({ silent: true });
  }, CLIENTS_REFRESH_INTERVAL_MS);
}

function syncStats(clientCount) {
  const favorites = Array.from(favoriteCountMap.values()).reduce((sum, count) => sum + count, 0);
  if (totalClients) {
    totalClients.textContent = String(clientCount);
  }
  if (totalFavorites) {
    totalFavorites.textContent = String(favorites);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Erro na requisicao.");
  }

  return data;
}

function buildSessionClientName(sessionEmail) {
  const firebaseName = firebaseAuth?.currentUser?.displayName?.trim();
  if (firebaseName) {
    return firebaseName;
  }

  const localUser = findUserByEmail(sessionEmail);
  if (localUser?.name?.trim()) {
    return localUser.name.trim();
  }

  return (sessionEmail.split("@")[0] || "Usuario").trim();
}

async function resolveSessionClientId() {
  const sessionEmail = localStorage.getItem(sessionStorageKey);
  if (!sessionEmail) {
    return null;
  }

  if (sessionClientCache.email === sessionEmail && sessionClientCache.id) {
    return sessionClientCache.id;
  }

  const clients = await request("/api/clients");
  let client = clients.find((item) => item.email === sessionEmail);

  if (!client) {
    const fallbackName = buildSessionClientName(sessionEmail);

    try {
      client = await request("/api/clients", {
        method: "POST",
        body: JSON.stringify({
          name: fallbackName,
          email: sessionEmail,
        }),
      });
    } catch (error) {
      // Caso outro fluxo tenha criado ao mesmo tempo, tenta buscar novamente.
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("ja cadastrado")) {
        const refreshed = await request("/api/clients");
        client = refreshed.find((item) => item.email === sessionEmail);
      } else {
        throw error;
      }
    }
  }

  if (!client) {
    sessionClientCache = { email: sessionEmail, id: null };
    return null;
  }

  sessionClientCache = { email: sessionEmail, id: client.id };
  return client.id;
}

async function syncFavoriteToBackend(productId) {
  try {
    const clientId = await resolveSessionClientId();
    if (!clientId) {
      return;
    }

    await request(`/api/clients/${clientId}/favorites`, {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  } catch (_error) {
    // Mantem UX local mesmo se backend estiver indisponivel.
  }
}

async function syncFavoriteRemovalToBackend(productId) {
  try {
    const clientId = await resolveSessionClientId();
    if (!clientId) {
      return;
    }

    await request(`/api/clients/${clientId}/favorites/${productId}`, { method: "DELETE" });
  } catch (_error) {
    // Mantem UX local mesmo se backend estiver indisponivel.
  }
}

function favoriteItemTemplate(clientId, favorite) {
  const review = favorite.review?.rate ? `Nota ${favorite.review.rate} (${favorite.review.count || 0})` : "Sem review";
  return `
    <article class="favorite-item">
      <img src="${escapeHtml(favorite.image)}" alt="${escapeHtml(favorite.title)}" />
      <div>
        <strong>${escapeHtml(favorite.title)}</strong><br />
        <small>R$ ${Number(favorite.price).toFixed(2)} | ${escapeHtml(review)}</small>
      </div>
      <button class="danger" data-action="remove-favorite" data-client-id="${clientId}" data-product-id="${favorite.id}">
        Remover
      </button>
    </article>
  `;
}

function clientTemplate(client) {
  return `
    <article class="client-card" data-client-id="${client.id}" data-client-name="${escapeHtml(client.name)}" data-client-email="${escapeHtml(client.email)}">
      <div class="client-head">
        <div>
          <strong>${escapeHtml(client.name)}</strong><br />
          <small>${escapeHtml(client.email)}</small>
        </div>
        <div class="client-actions">
          <button data-action="edit-client" data-client-id="${client.id}">Editar</button>
          <button class="danger" data-action="remove-client" data-client-id="${client.id}">Excluir</button>
        </div>
      </div>

      <div class="favorite-actions">
        <input type="number" min="1" placeholder="ID do produto" data-favorite-input="${client.id}" />
        <button data-action="add-favorite" data-client-id="${client.id}">Adicionar favorito</button>
      </div>

      <div class="favorite-list" id="favorites-${client.id}">Carregando favoritos...</div>
    </article>
  `;
}

function openEditModal(clientId, name, email) {
  editClientId.value = clientId;
  editName.value = name;
  editEmail.value = email;
  editModal.classList.remove("hidden");
}

function closeEditModal() {
  editModal.classList.add("hidden");
  editClientForm.reset();
}

async function loadFavorites(clientId) {
  const container = document.getElementById(`favorites-${clientId}`);
  if (!container) {
    return;
  }

  try {
    // Busca favoritos do backend (Realtime Database)
    const res = await fetch(`${apiBase}/api/clients/${clientId}/favorites`);
    const favorites = res.ok ? await res.json() : [];
    favoriteCountMap.set(clientId, favorites.length);
    favoritePreviewMap.set(clientId, favorites.map((favorite) => ({ title: favorite.title })));
    renderSidebarFavorites();

    if (!favorites.length) {
      container.innerHTML = "Nenhum favorito cadastrado.";
      return;
    }

    container.innerHTML = favorites.map((favorite) => favoriteItemTemplate(clientId, favorite)).join("");
  } catch (error) {
    container.innerHTML = `<span style="color:#c1121f">${escapeHtml(error.message)}</span>`;
    favoriteCountMap.set(clientId, 0);
    favoritePreviewMap.set(clientId, []);
    renderSidebarFavorites();
  }
}

async function loadClients(options = {}) {
  const silent = Boolean(options.silent);

  if (isLoadingClients) {
    hasPendingClientsLoad = true;
    return;
  }

  isLoadingClients = true;
  if (!silent) {
    favoriteCountMap = new Map();
    favoritePreviewMap = new Map();
    renderSidebarFavorites();
    clientsContainer.innerHTML = "<span>Carregando clientes...</span>";
  }
  showGlobalError("");
  try {
    const clients = await request("/api/clients");
    syncStats(clients.length);
    renderCatalog();
    if (!clients.length) {
      clientsContainer.innerHTML = "";
      return;
    }
    clientsContainer.innerHTML = clients.map(clientTemplate).join("");
    await Promise.all(clients.map((client) => loadFavorites(client.id)));
    syncStats(clients.length);
  } catch (error) {
    if (!silent) {
      showGlobalError("Não foi possível conectar à API. Verifique a URL e tente novamente.");
      clientsContainer.innerHTML = "<span style='color:#c1121f'>API indisponível no momento. Ajuste a URL Base e tente novamente.</span>";
      renderCatalog();
      syncStats(0);
    }
  } finally {
    isLoadingClients = false;
    if (hasPendingClientsLoad) {
      hasPendingClientsLoad = false;
      void loadClients({ silent });
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopClientsAutoRefresh();
    return;
  }

  if (localStorage.getItem(sessionStorageKey)) {
    startClientsAutoRefresh();
    void loadClients();
  }
});
// Inicialização do catálogo ao abrir o app
fetchCatalogProducts();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || password.length < 4) {
    showMessage("Informe e-mail e senha validos.", true);
    return;
  }

  if (!loginTermsAccepted?.checked) {
    showMessage("Leia e marque o termo de responsabilidade para entrar.", true);
    return;
  }

  const isAdmin = isAdminCredential(email, password);

  if (isAdmin) {
    // Admin local entra mesmo sem cadastro no Firebase Auth
  } else if (firebaseAuth) {
    try {
      await firebaseAuth.signInWithEmailAndPassword(email, password);
    } catch (_error) {
      showMessage("Credenciais invalidas. Verifique seus dados.", true);
      return;
    }
  } else {
    const existingUser = findUserByEmail(email);
    if (!existingUser || existingUser.password !== password) {
      showMessage("Credenciais invalidas. Verifique seus dados.", true);
      return;
    }
  }

  setSession(email, isAdmin);
  if (isAdmin) {
    renderAdminUsers();
    renderAdminProducts();
  }
  showMessage("Sessão iniciada com sucesso.");
  appView.classList.remove("hidden");
  clientsContainer.innerHTML = "<span>Carregando clientes...</span>";
  await loadClients();
});

registerForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const password = document.getElementById("registerPassword").value.trim();

  if (!name || !email || password.length < 4) {
    showMessage("Preencha os campos corretamente para criar a conta.", true);
    return;
  }

  const localExistingUser = findUserByEmail(email);

  const remoteUsers = await getRemoteUsers();
  const emailAlreadyExistsRemote = remoteUsers.some((user) => (user.email || "").toLowerCase() === email);
  if (emailAlreadyExistsRemote) {
    showMessage("Ja existe uma conta com esse e-mail.", true);
    return;
  }

  // Limpa registro local antigo para evitar bloqueio falso ao trocar de origem/porta.
  if (localExistingUser) {
    const cleanedUsers = getUsers().filter((user) => user.email !== email);
    saveUsers(cleanedUsers);
  }

  let backendClientCreated = false;
  // Sempre tenta criar no backend (Realtime Database)
  try {
    const res = await fetch(`${apiBase}/api/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    if (res.ok) backendClientCreated = true;
  } catch (e) {
    // ignora erro, segue fluxo local
  }

  if (firebaseAuth) {
    try {
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      if (userCredential.user) {
        await userCredential.user.updateProfile({ displayName: name });
      }
      registerForm.reset();
      setSession(email, false);
      showMessage(backendClientCreated ? "Conta criada com sucesso!" : "Conta criada (apenas local/Firebase).", !backendClientCreated);
      appView.classList.remove("hidden");
      clientsContainer.innerHTML = "<span>Carregando clientes...</span>";
      await loadClients();
      return;
    } catch (error) {
      const firebaseError = String(error?.code || "");
      if (firebaseError === "auth/email-already-in-use") {
        // Se o backend nao tem duplicidade, segue com fallback local para nao bloquear o cadastro.
        showMessage("Conta ja existente no auth remoto. Prosseguindo com cadastro local.");
      }
      if (firebaseError === "auth/invalid-email") {
        showMessage("E-mail invalido.", true);
        return;
      }
      // Fallback local para ambiente de desenvolvimento quando Firebase nao estiver disponivel
    }
  }

  const users = getUsers().filter((user) => user.email !== email);
  users.push({ name, email, password });
  saveUsers(users);
  registerForm.reset();
  setSession(email, false);
  showMessage(backendClientCreated ? "Conta criada com sucesso!" : "Conta criada (apenas local).", !backendClientCreated);
  appView.classList.remove("hidden");
  clientsContainer.innerHTML = "<span>Carregando clientes...</span>";
  await loadClients();
});

showLoginButton.addEventListener("click", () => switchAuthMode("login"));
showRegisterButton.addEventListener("click", () => switchAuthMode("register"));

logoutButton.addEventListener("click", async () => {
  if (firebaseAuth) {
    try {
      await firebaseAuth.signOut();
    } catch (_error) {
      // Mantem fluxo local mesmo se falhar logout remoto
    }
  }
  clearSession();
});

saveApiBaseButton.addEventListener("click", async () => {
  apiBase = apiInput.value.trim().replace(/\/$/, "");
  localStorage.setItem(apiStorageKey, apiBase);
  showMessage("URL da API atualizada.");
  appView.classList.remove("hidden");
  clientsContainer.innerHTML = "<span>Carregando clientes...</span>";
  await loadClients();
});

if (openAdminPageBtn) {
  openAdminPageBtn.addEventListener("click", () => {
    if (!isAdminSession()) {
      return;
    }

    hidePrimarySections();
    adminPageSection?.classList.remove("hidden");
    renderAdminUsers();
    renderAdminProducts();
  });
}

if (closeAdminPageBtn) {
  closeAdminPageBtn.addEventListener("click", () => {
    showCatalogSection();
  });
}

if (adminUsersList) {
  adminUsersList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-admin-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.adminAction;
    const userIndex = Number(button.dataset.userIndex);
    const users = getUsers();

    if (!Number.isInteger(userIndex) || userIndex < 0 || userIndex >= users.length) {
      return;
    }

    if (action === "delete-user") {
      users.splice(userIndex, 1);
      saveUsers(users);
      renderAdminUsers();
      showMessage("Usuário excluído.");
      return;
    }

    if (action === "save-user") {
      const card = button.closest(".admin-item");
      const name = card.querySelector('[data-user-field="name"]').value.trim();
      const email = card.querySelector('[data-user-field="email"]').value.trim().toLowerCase();
      const password = card.querySelector('[data-user-field="password"]').value.trim();

      if (!name || !email || password.length < 4) {
        showMessage("Dados de usuário inválidos.", true);
        return;
      }

      users[userIndex] = { name, email, password };
      saveUsers(users);
      renderAdminUsers();
      updateSidebarProfile(localStorage.getItem(sessionStorageKey));
      showMessage("Usuário atualizado.");
    }
  });
}

if (adminProductsList) {
  adminProductsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-admin-action='save-product']");
    if (!button) {
      return;
    }

    const productId = Number(button.dataset.productId);
    const card = button.closest(".admin-item");
    const title = card.querySelector('[data-product-field="title"]').value.trim();
    const price = Number(card.querySelector('[data-product-field="price"]').value);
    const category = card.querySelector('[data-product-field="category"]').value.trim();
    const image = card.querySelector('[data-product-field="image"]').value.trim();
    const description = card.querySelector('[data-product-field="description"]').value.trim();
    const ratingRate = Number(card.querySelector('[data-product-field="ratingRate"]').value);
    const ratingCount = Number(card.querySelector('[data-product-field="ratingCount"]').value);

    if (!title || !category || !image || !description || Number.isNaN(price) || price < 0 || Number.isNaN(ratingRate) || ratingRate < 0 || Number.isNaN(ratingCount) || ratingCount < 0) {
      showMessage("Dados de produto inválidos.", true);
      return;
    }

    const product = catalogProducts.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    product.title = title;
    product.price = price;
    product.category = category;
    product.image = image;
    product.description = description;
    product.rating = { rate: ratingRate, count: ratingCount };

    cartItems = cartItems.map((item) => item.id === productId ? { ...item, title, price, category, image } : item);
    saveCart();
    updateProductOverride(productId, {
      title,
      price,
      category,
      image,
      description,
      ratingRate,
      ratingCount,
    });
    renderCatalog();
    renderCartPage();
    renderAdminProducts();
    showMessage("Produto atualizado.");
  });
}

if (openTermsBtn) {
  openTermsBtn.addEventListener("click", () => {
    termsModal?.classList.remove("hidden");
  });
}

if (closeTermsBtn) {
  closeTermsBtn.addEventListener("click", () => {
    termsModal?.classList.add("hidden");
  });
}

if (termsModal) {
  termsModal.addEventListener("click", (event) => {
    if (event.target === termsModal) {
      termsModal.classList.add("hidden");
    }
  });
}

clientsContainer.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const clientId = button.dataset.clientId;

  try {
    if (action === "remove-client") {
      await request(`/api/clients/${clientId}`, { method: "DELETE" });
      showMessage("Cliente removido.");
      await loadClients();
      return;
    }

    if (action === "edit-client") {
      const card = button.closest(".client-card");
      const currentName = card.dataset.clientName || "";
      const currentEmail = card.dataset.clientEmail || "";
      openEditModal(clientId, currentName, currentEmail);
      return;
    }

    if (action === "add-favorite") {
      const input = document.querySelector(`[data-favorite-input="${clientId}"]`);
      if (!input) {
        showMessage("Tente novamente em alguns segundos.", true);
        return;
      }
      const productId = Number(input.value);

      await request(`/api/clients/${clientId}/favorites`, {
        method: "POST",
        body: JSON.stringify({ productId }),
      });

      input.value = "";
      showMessage("Favorito adicionado.");
      await loadFavorites(clientId);
      syncStats(document.querySelectorAll(".client-card").length);
      return;
    }

    if (action === "remove-favorite") {
      const productId = button.dataset.productId;
      await request(`/api/clients/${clientId}/favorites/${productId}`, { method: "DELETE" });

      showMessage("Favorito removido.");
      await loadFavorites(clientId);
      syncStats(document.querySelectorAll(".client-card").length);
    }
  } catch (error) {
    showMessage(error.message, true);
  }
});

sidebarFavoriteList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const productId = Number(button.dataset.productId);
  const cartProduct = cartItems.find((item) => item.id === productId);
  if (!cartProduct) {
    return;
  }

  if (button.dataset.action === "remove-cart-item") {
    removeFromFavorites(productId);
    showMessage("Item removido dos favoritos.");
    return;
  }

  if (button.dataset.action === "buy-cart-item") {
    buyProduct(cartProduct);
  }
});

cancelEditButton.addEventListener("click", closeEditModal);

editModal.addEventListener("click", (event) => {
  if (event.target === editModal) {
    closeEditModal();
  }
});

editClientForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const clientId = editClientId.value;
  const name = editName.value.trim();
  const email = editEmail.value.trim();

  try {
    await request(`/api/clients/${clientId}`, {
      method: "PUT",
      body: JSON.stringify({ name, email }),
    });

    closeEditModal();
    showMessage("Cliente atualizado com sucesso.");
    await loadClients();
  } catch (error) {
    showMessage(error.message, true);
  }
});

const existingSession = localStorage.getItem(sessionStorageKey);
cartItems = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
renderSidebarFavorites();
const firebaseSessionEmail = firebaseAuth?.currentUser?.email || null;
const sessionEmail = firebaseSessionEmail || existingSession;
if (sessionEmail) {
  const isAdmin = isAdminSession();
  setSession(sessionEmail, isAdmin);
  if (isAdmin) {
    renderAdminUsers();
    renderAdminProducts();
  }
  appView.classList.remove("hidden");
  clientsContainer.innerHTML = "<span>Carregando clientes...</span>";
  loadClients();
  authView.classList.add("hidden");
} else {
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
  switchAuthMode("login");
}
