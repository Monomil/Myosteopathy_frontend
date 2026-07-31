import { NavLink, Outlet } from "react-router-dom";
import Header from "@/components/Header";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/schemas", label: "Schemas" },
  { to: "/admin/rules", label: "Rules" },
  { to: "/admin/examples", label: "Examples" },
  { to: "/admin/records", label: "Records" },
  { to: "/admin/snapshots", label: "Snapshots" },
];

export default function Admin() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Reference Data Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage the schemas, rules, and examples that ground every transform.
          </p>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <nav className="col-span-12 md:col-span-3 lg:col-span-2 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  cn(
                    "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="col-span-12 md:col-span-9 lg:col-span-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
