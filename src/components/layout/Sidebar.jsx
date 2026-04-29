import { NavLink } from "react-router-dom";
import { Wheat } from "lucide-react";
import { NAV_ITEMS } from "../../lib/constants";
import { cn } from "../../lib/utils";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark">
          <Wheat size={20} />
        </div>
        <div>
          <p className="eyebrow">EasyFormul</p>
          <h1>Version Web</h1>
        </div>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn("sidebar__link", isActive && "sidebar__link--active")
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <p>
          Formulation least-cost, gestion du referentiel et import Excel
          centralises dans Supabase.
        </p>
      </div>
    </aside>
  );
}
