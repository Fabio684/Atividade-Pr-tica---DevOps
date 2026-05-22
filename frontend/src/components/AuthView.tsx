import { useState } from "react";
import type { AuthMode } from "../types";

interface AuthViewProps {
  busy: boolean;
  message: string;
  onOpenTerms: () => void;
  onLogin: (input: { email: string; password: string; termsAccepted: boolean }) => Promise<void>;
  onRegister: (input: { name: string; email: string; password: string }) => Promise<void>;
}

export function AuthView({ busy, message, onOpenTerms, onLogin, onRegister }: AuthViewProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  return (
    <section className="auth-view">
      <div className="auth-card panel-surface">
        <div className="auth-brand">
          <img src="/img/Gemini_Generated_Image_70988h70988h7098-removebg-preview.png" alt="Logo Favorites Hub" className="site-logo auth-logo" />
          <span>Favorites Hub</span>
        </div>

        <h1>Acesse sua conta</h1>
        <p className="auth-subtitle">Entre para gerenciar clientes, favoritos e compras.</p>

        <div className="auth-switch" role="tablist" aria-label="Alternar entre login e cadastro">
          <button type="button" className={`tab-btn ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={`tab-btn ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Criar conta</button>
        </div>

        {mode === "login" ? (
          <form className="auth-form" onSubmit={(event) => {
            event.preventDefault();
            void onLogin({ email: loginEmail, password: loginPassword, termsAccepted });
          }}>
            <label>
              E-mail
              <input value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} type="email" placeholder="admin@empresa.com" required />
            </label>
            <label>
              Senha
              <input value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} type="password" placeholder="Digite sua senha" minLength={4} required />
            </label>
            <div className="terms-row">
              <label className="terms-check">
                <input checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} type="checkbox" />
                Termo de responsabilidade lido
              </label>
              <button type="button" className="ghost-btn" onClick={onOpenTerms}>Ler termo</button>
            </div>
            <button type="submit" disabled={busy}>Entrar</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={(event) => {
            event.preventDefault();
            void onRegister({ name: registerName, email: registerEmail, password: registerPassword });
          }}>
            <label>
              Nome
              <input value={registerName} onChange={(event) => setRegisterName(event.target.value)} type="text" placeholder="Seu nome" required />
            </label>
            <label>
              E-mail
              <input value={registerEmail} onChange={(event) => setRegisterEmail(event.target.value)} type="email" placeholder="voce@empresa.com" required />
            </label>
            <label>
              Senha
              <input value={registerPassword} onChange={(event) => setRegisterPassword(event.target.value)} type="password" placeholder="Crie uma senha" minLength={4} required />
            </label>
            <button type="submit" disabled={busy}>Criar conta</button>
          </form>
        )}

        {message ? <p className="message auth-message">{message}</p> : null}
      </div>
    </section>
  );
}