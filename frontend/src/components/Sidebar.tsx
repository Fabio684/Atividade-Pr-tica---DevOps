interface SidebarProps {
  userName: string;
  userEmail: string;
  favoriteCount: number;
  clientCount: number;
  isAdmin: boolean;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onShowCatalog: () => void;
  onLogout: () => void;
}

export function Sidebar({
  userName,
  userEmail,
  favoriteCount,
  clientCount,
  isAdmin,
  onOpenCart,
  onOpenAdmin,
  onShowCatalog,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="sidebar panel-surface">
      <div className="brand-block">
        <img src="/img/Gemini_Generated_Image_70988h70988h7098-removebg-preview.png" alt="Logo Favorites Hub" className="site-logo brand-logo" />
        <div>
          <span className="brand-name">Favorites Hub</span>
          <p className="muted">Clientes, favoritos e compras</p>
        </div>
      </div>

      <section className="sidebar-user">
        <h2>Perfil do usuário</h2>
        <p className="sidebar-user-name">{userName || "-"}</p>
        <p className="muted">{userEmail || "-"}</p>
      </section>

      <section className="sidebar-stats">
        <div className="stat-box">
          <small>Clientes</small>
          <strong>{clientCount}</strong>
        </div>
        <div className="stat-box">
          <small>Favoritos</small>
          <strong>{favoriteCount}</strong>
        </div>
      </section>

      <section className="sidebar-actions">
        <button type="button" className="ghost-btn" onClick={onShowCatalog}>Ver catálogo</button>
        <button type="button" className="ghost-btn" onClick={onOpenCart}>Mostrar favoritos</button>
        {isAdmin ? <button type="button" className="ghost-btn" onClick={onOpenAdmin}>Painel admin</button> : null}
      </section>

      <button type="button" className="ghost-btn logout-btn" onClick={onLogout}>Sair</button>
    </aside>
  );
}