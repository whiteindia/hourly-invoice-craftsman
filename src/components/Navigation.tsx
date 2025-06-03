
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
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const Navigation = () => {
  const { signOut, userRole } = useAuth();
  const location = useLocation();

  // Convert userRole to string to handle comparison properly
  const roleString = userRole as string;

  const navItems = [
    { path: '/', label: 'Dashboard', icon: Home },
    // Clients - only admin can see
    ...(roleString === 'admin' ? [{ path: '/clients', label: 'Clients', icon: Users }] : []),
    // Employees - admin and managers can see
    ...(roleString === 'admin' || roleString === 'manager' ? [{ path: '/employees', label: 'Employees', icon: UserCheck }] : []),
    // Projects - admin, managers can see projects; other roles have limited access
    ...(roleString === 'admin' || roleString === 'manager' ? [{ path: '/projects', label: 'Projects', icon: FolderOpen }] : []),
    // Tasks - everyone can see tasks (with role-based filtering in the component)
    { path: '/tasks', label: 'Tasks', icon: CheckSquare },
    // Invoices - admin and accountant can see
    ...(roleString === 'admin' || roleString === 'accountant' ? [{ path: '/invoices', label: 'Invoices', icon: FileText }] : []),
    // Payments - admin and accountant can see
    ...(roleString === 'admin' || roleString === 'accountant' ? [{ path: '/payments', label: 'Payments', icon: DollarSign }] : []),
    // Services - everyone can see
    { path: '/services', label: 'Services', icon: Settings },
    // Wages - everyone can see
    { path: '/wages', label: 'Wages', icon: Wallet },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-blue-600">
              WhiteIndia
            </Link>
            <div className="hidden md:flex space-x-4">
              {navItems.map((item) => {
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
            </div>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
