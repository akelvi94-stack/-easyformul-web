import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { HeaderBar } from "./HeaderBar";

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-shell__main">
        <HeaderBar />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
