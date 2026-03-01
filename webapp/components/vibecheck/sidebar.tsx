'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Scan,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Logo } from './logo';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/scan', label: 'Scan', icon: Scan },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: (typeof navItems)[0];
  isActive: boolean;
  collapsed: boolean;
}) {
  const inner = (
    <Link href={item.href}>
      <motion.div
        whileHover={{ x: collapsed ? 0 : 4 }}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-none transition-all border-l-2',
          collapsed ? 'justify-center px-3' : '',
          isActive
            ? 'border-primary bg-primary/10 text-primary glow-cyan'
            : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <item.icon size={20} className="shrink-0" />
        {!collapsed && <span className="font-medium tracking-wide">{item.label}</span>}
      </motion.div>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <TooltipProvider>
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={cn(
          'h-screen sticky top-0 shrink-0 bg-sidebar border-r border-sidebar-border/50 flex flex-col transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Logo + collapse toggle */}
        <div className="p-4 border-b border-sidebar-border/50 flex items-center justify-between">
          <Link href="/scan">
            <Logo size={collapsed ? 'sm' : 'md'} showText={!collapsed} />
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(true)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
            >
              <ChevronLeft size={16} />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn('p-3 space-y-1', collapsed && 'px-2')}>
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        <div className={cn('p-3 border-t border-sidebar-border/50 space-y-1', collapsed && 'px-2')}>
          {collapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(false)}
                    className="w-full h-10 text-muted-foreground hover:text-foreground"
                  >
                    <ChevronRight size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Expand sidebar</TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    className="w-full h-10 text-muted-foreground hover:text-red-400"
                  >
                    <LogOut size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>Logout</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              {user && (
                <div className="px-3 py-2 text-sm text-muted-foreground truncate">
                  {user.email}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="w-full justify-start gap-3 text-muted-foreground hover:text-red-400"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </Button>
            </>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
