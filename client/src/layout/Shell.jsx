import { Bi, LogoMark } from "../components/common.jsx";
import { navItems, roleViews } from "../constants.js";

export function Shell({ auth, activeView, setActiveView, onLogout, children }) {
  const allowed = roleViews[auth.user.role] || [];
  const items = navItems.filter((item) => allowed.includes(item.id));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <LogoMark invert />
        </div>

        <nav className="nav-list">
          {items.map((item) => {
            return (
              <button
                type="button"
                key={item.id}
                className={activeView === item.id ? "nav-item active" : "nav-item"}
                onClick={() => setActiveView(item.id)}
                title={item.label}
              >
                <Bi name={item.iconName} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <Bi name="person-workspace" />
            <div>
              <strong>{auth.user.name}</strong>
              <span>{auth.user.roleLabel}</span>
            </div>
          </div>
          <button type="button" className="ghost-action full" onClick={onLogout}>
            <Bi name="box-arrow-right" />
            Sair
          </button>
        </div>
      </aside>
      <section className="workspace">{children}</section>
    </div>
  );
}
