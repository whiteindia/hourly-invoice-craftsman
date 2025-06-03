
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
  Wallet,
  Menu
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useAuth } from '@/contexts/AuthContext';
import { usePrivileges } from '@/hooks/usePrivileges';
import { useIsMobile } from '@/hooks/use-mobile';

const Navigation = ({ children }: { children?: React.ReactNode }) => {
  const { signOut, user } = useAuth();
  const { hasPageAccess, loading: privilegesLoading } = usePrivileges();
  const location = useLocation();
  const isMobile = useIsMobile();

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
    if (item.pageName === 'dashboard') return true;
    return hasPageAccess(item.pageName);
  });

  const visibleConfigItems = configItems.filter(item => {
    return hasPageAccess(item.pageName);
  });

  const isActive = (path: string) => location.pathname === path;

  // Show loading state while privileges are being fetched
  if (privilegesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading...</div>
      </div>
    );
  }

  const SidebarMenuContent = () => (
    <>
      <SidebarHeader className="border-b">
        <Link to="/" className="text-xl font-bold text-blue-600 p-4">
          WhiteIndia
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMainNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)}>
                      <Link to={item.path}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleConfigItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleConfigItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActive(item.path)}>
                        <Link to={item.path}>
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="p-4 space-y-2">
          <div className="text-sm text-gray-600 truncate">
            {user?.email}
          </div>
          <Button variant="outline" onClick={signOut} className="w-full">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </>
  );

  if (isMobile) {
    return (
      <div className="min-h-screen w-full">
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="flex justify-between items-center h-16 px-4">
            <Link to="/" className="text-xl font-bold text-blue-600">
              WhiteIndia
            </Link>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="h-[80vh]">
                  <SidebarProvider>
                    <Sidebar>
                      <SidebarMenuContent />
                    </Sidebar>
                  </SidebarProvider>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </header>
        <main className="p-4">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarMenuContent />
        </Sidebar>
        <SidebarInset>
          <header className="bg-white shadow-sm border-b sticky top-0 z-50">
            <div className="flex justify-between items-center h-16 px-4">
              <SidebarTrigger />
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
          </header>
          <main className="flex-1 p-4">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Navigation;
