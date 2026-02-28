'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Scan, 
  AlertTriangle, 
  Wrench, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { Logo } from './logo';
import { RepoList } from './repo-list';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  { href: '/scan', label: 'Scan', icon: Scan },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vulnerabilities', label: 'Vulnerabilities', icon: AlertTriangle },
  { href: '/remediation', label: 'Remediation Hub', icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        'h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/scan">
          <Logo size={collapsed ? 'sm' : 'md'} showText={!collapsed} />
        </Link>
      </div>

      <nav className="p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground glow-cyan'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon size={20} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* GitHub Repositories */}
      <div className="flex-1 min-h-0 overflow-hidden border-t border-sidebar-border/40">
        <RepoList collapsed={collapsed} />
      </div>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>

        {!collapsed && user && (
          <div className="px-4 py-2 text-sm text-muted-foreground truncate">
            {user.email}
          </div>
        )}

        <Link href="/settings" className="block">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'w-full justify-start gap-3 text-muted-foreground hover:text-foreground',
              collapsed && 'justify-center'
            )}
          >
            <Settings size={18} />
            {!collapsed && <span>Settings</span>}
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className={cn(
            'w-full justify-start gap-3 text-muted-foreground hover:text-red-400',
            collapsed && 'justify-center'
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
