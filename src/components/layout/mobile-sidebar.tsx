"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetClose } from "@/components/ui/sheet";
import { TOP_LEVEL_NAV, isTopLevelActive } from "@/lib/nav";

export function MobileSidebar() {
  const pathname = usePathname();

  return (
    <ScrollArea className="h-full py-4">
      <div className="px-3 py-2">
        <h2 className="mb-4 px-3 text-lg font-semibold tracking-tight">
          Claude Code
        </h2>
        <nav className="space-y-1">
          {TOP_LEVEL_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = isTopLevelActive(item, pathname);
            return (
              <SheetClose key={item.title} asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </div>
    </ScrollArea>
  );
}
