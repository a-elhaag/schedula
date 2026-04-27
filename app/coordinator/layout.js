"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BookOpenIcon,
  HomeIcon,
  UserIcon,
  CalendarIcon,
  BoltIcon,
  GearIcon,
  SettingsIcon,
  GraduationCapIcon,
  DownloadIcon,
} from "@/components/icons/index";
import { clearAllCached } from "@/lib/clientCache";
import "./layout.css";

const NAV_ITEMS = [
  { href: "/coordinator/setup",              label: "Setup",      Icon: HomeIcon          },
  { href: "/coordinator/courses",            label: "Courses",    Icon: BookOpenIcon      },
  { href: "/coordinator/staff",              label: "Staff",      Icon: UserIcon          },
  { href: "/coordinator/rooms",              label: "Rooms",      Icon: GraduationCapIcon },
  { href: "/coordinator/constraints",        label: "Constraints",Icon: BoltIcon          },
  { href: "/coordinator/assign",             label: "Assign",     Icon: CalendarIcon      },
  { href: "/coordinator/schedule/generate",  label: "Generate",   Icon: BoltIcon          },
  { href: "/coordinator/schedule/review",    label: "Review",     Icon: GearIcon          },
  { href: "/coordinator/schedule/published", label: "Published",  Icon: CalendarIcon      },
  { href: "/coordinator/analytics",          label: "Analytics",  Icon: BoltIcon          },
  { href: "/coordinator/import",             label: "Import",     Icon: DownloadIcon      },
  { href: "/coordinator/users",              label: "Users",      Icon: UserIcon          },
  { href: "/coordinator/settings",           label: "Settings",   Icon: SettingsIcon      },
];

export default function CoordinatorLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    clearAllCached();
    try {
      await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    } finally {
      router.push("/signin");
      router.refresh();
    }
  }

  return (
    <div className="coord-shell">
      <aside className="coord-sidebar">
        <div className="coord-sidebar__brand">Schedula</div>
        <nav className="coord-sidebar__nav">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`coord-sidebar__item${active ? " coord-sidebar__item--active" : ""}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          className="coord-sidebar__signout"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </aside>
      <main className="coord-content">{children}</main>
    </div>
  );
}
