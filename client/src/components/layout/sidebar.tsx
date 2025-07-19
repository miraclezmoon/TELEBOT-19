import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  Users, 
  Coins, 
  Gift, 
  Store, 
  UserPlus, 
  History, 
  Settings,
  Send,
  GraduationCap,
  Palette
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Coin System', href: '/coins', icon: Coins },
  { name: 'Raffles', href: '/raffles', icon: Gift },
  { name: 'Shop', href: '/shop', icon: Store },
  { name: 'Referrals', href: '/referrals', icon: UserPlus },
  { name: 'Themes', href: '/themes', icon: Palette },
  { name: 'Transaction Logs', href: '/logs', icon: History },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();
  
  const { data: admin } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  return (
    <div className="w-64 bg-card shadow-lg border-r border-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Send className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">HelloKorean</h1>
            <p className="text-sm text-muted-foreground">Bot Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      {/* Admin User Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">{admin?.name || 'Admin User'}</p>
            <p className="text-sm text-muted-foreground">Administrator</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
