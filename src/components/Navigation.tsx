
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Users, 
  UserCheck,
  FolderOpen, 
  CheckSquare, 
  FileText, 
  DollarSign,
  Settings,
  LogOut,
  Wallet
} from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const { signOut, user } = useAuth();
  const { hasPageAccess, loading: privilegesLoading } = usePrivileges();
  const location = useLocation();

  const mainNavItems = [
    { path: '/', label: 'Dashboard', icon: Home, pageName: 'dashboard' },
    { path: '/projects', label: 'Projects', icon: FolderOpen, pageName: 'projects' },
    { path: '/tasks', label: 'Tasks', icon: CheckSquare, pageName: 'tasks' },
    { path: '/invoices', label: 'Invoices', icon: FileText, pageName: 'invoices' },
    { path: '/payments', label: 'Payments', icon: DollarSign, pageName: 'payments' },
    { path: '/wages', label: 'Wages', icon: Wallet, pageName: 'wages' },
  ];

  const configItems = [
    { path: '/clients', label: 'Clients', icon: Users, pageName: 'clients' },
    { path: '/employees', label: 'Employees', icon: UserCheck, pageName: 'employees' },
    { path: '/services', label: 'Services', icon: Settings, pageName: 'services' },
    { path: '/roles', label: 'Roles', icon: UserCheck, pageName: 'roles' },
  ];

  // Filter items based on privileges
  const visibleMainNavItems = mainNavItems.filter(item => {
    // Always show dashboard
    if (item.pageName === 'dashboard') return true;
    // Check if user has read access to the page
    return hasPageAccess(item.pageName);
  });

  const visibleConfigItems = configItems.filter(item => {
    return hasPageAccess(item.pageName);
  });

  const isActive = (path: string) => location.pathname === path;
  const isConfigActive = visibleConfigItems.some(item => isActive(item.path));

  // Show loading state while privileges are being fetched
  if (privilegesLoading) {
    return (
      <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-blue-600">
              WhiteIndia
            </Link>
            <div className="text-sm text-gray-600">Loading...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              WhiteIndia
            </Link>
            <div className="hidden md:flex items-center space-x-4">
              {visibleMainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive(item.path)
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Config dropdown menu - only show if there are config items */}
              {visibleConfigItems.length > 0 && (
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuTrigger
                        className={cn(
                          "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors h-auto",
                          isConfigActive
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        )}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Config</span>
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <div className="w-48 p-2 bg-white">
                          {visibleConfigItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                  "flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors w-full",
                                  isActive(item.path)
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
