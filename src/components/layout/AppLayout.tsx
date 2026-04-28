"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BookOpen,
  Flame,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Rocket,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { NewMotorAccordion } from "@/components/motor/NewMotorAccordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItemClass =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/motors", label: "Motors", icon: Flame },
  { href: "/simulations", label: "Simulations", icon: Activity },
  {
    href: "https://felipebogaertsm.github.io/machwave/",
    label: "Documentation",
    icon: BookOpen,
    external: true,
  },
  { href: "/about", label: "About", icon: Info },
];

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-5">
        <Rocket className="h-5 w-5 text-primary" />
        <span className="font-mono text-sm font-bold lowercase tracking-tight">
          machwave
        </span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-3">
        <NewMotorAccordion
          itemClassName={navItemClass}
          onNavigate={onNavClick}
        />
        {navItems.map(({ href, label, icon: Icon, external }) => {
          const className = cn(
            navItemClass,
            !external && pathname === href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
          );
          if (external) {
            return (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onNavClick}
                className={className}
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavClick}
              className={className}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <div className="p-3 space-y-1">
        <p className="truncate px-3 py-1 text-xs text-muted-foreground">
          {user?.email}
        </p>
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onNavClick}
            className={cn(
              navItemClass,
              pathname === "/admin"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground",
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            Admin
          </Link>
        )}
        <Link
          href="/settings"
          onClick={onNavClick}
          className={cn(
            navItemClass,
            pathname === "/settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground",
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          type="button"
          onClick={logout}
          className={cn(navItemClass, "w-full text-muted-foreground")}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar — sticky, full height */}
      <aside className="hidden md:flex h-screen w-56 flex-col border-r bg-card sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-card px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" showCloseButton={false} className="p-0">
              <div className="flex h-full flex-col">
                <SidebarContent onNavClick={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <div className="ml-3 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <span className="font-mono text-sm font-bold lowercase tracking-tight">
              machwave
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
