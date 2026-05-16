import { useState } from "react";
import { Bi, LogoMark } from "../components/common.jsx";
import { LoginMapPreview } from "../components/MapSurface.jsx";
import { profiles } from "../constants.js";

export function LoginScreen({ onLogin, busy, error }) {
  const [selected, setSelected] = useState(profiles[0]);

  return (
    <main className="login-screen">
      <section className="login-brand-panel">
        <div className="login-brand-row">
          <LogoMark invert />
          <span>Fleet operations suite</span>
        </div>
        <div className="login-copy">
          <p className="eyebrow">Centro de comando logistico</p>
          <h1>Rastreamento de entregas em tempo real.</h1>
          <p className="login-subtitle">
            Uma visao limpa para acompanhar motoristas, rotas, ocorrencias e entregas criticas sem perder o controle da operacao.
          </p>
          <div className="login-signal-grid">
            <article>
              <Bi name="activity" />
              <strong>98.4%</strong>
              <span>SLA hoje</span>
            </article>
            <article>
              <Bi name="truck-front-fill" />
              <strong>04</strong>
              <span>Motoristas</span>
            </article>
            <article>
              <Bi name="geo-alt-fill" />
              <strong>05</strong>
              <span>Regioes</span>
            </article>
          </div>
        </div>
        <LoginMapPreview />
      </section>

      <section className="login-panel">
        <div className="login-panel-head">
          <LogoMark compact />
          <div>
            <span>Entrar no workspace</span>
            <h2>Selecionar usuario</h2>
          </div>
        </div>

        <div className="profile-grid">
          {profiles.map((profile) => {
            return (
              <button
                type="button"
                key={profile.role}
                className={selected.role === profile.role ? "profile-option active" : "profile-option"}
                onClick={() => setSelected(profile)}
              >
                <Bi name={profile.iconName} />
                <span>{profile.label}</span>
              </button>
            );
          })}
        </div>

        <div className="credential-box">
          <b>Credenciais de demo</b>
          <span>
            <Bi name="envelope-at" />
            {selected.email}
          </span>
          <span>
            <Bi name="key-fill" />
            {selected.password}
          </span>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button
          type="button"
          className="primary-action"
          disabled={busy}
          onClick={() => onLogin(selected)}
        >
          <Bi name="arrow-right-circle-fill" />
          {busy ? "Entrando..." : `Entrar como ${selected.label}`}
        </button>
        <p className="login-security-note">
          <Bi name="shield-check" />
          Ambiente demonstrativo com perfis e permissoes separadas.
        </p>
      </section>
    </main>
  );
}
