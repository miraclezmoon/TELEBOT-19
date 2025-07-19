import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "./sidebar";
import { useQuery } from "@tanstack/react-query";
import { Circle } from "lucide-react";
import { ThemeToggle } from "../theme-toggle";
import { CoinLoadingScreen } from "@/components/ui/coin-spinner";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState("Dashboard");
  
  const { data: admin, error } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLocation('/login');
      return;
    }
  }, [setLocation]);

  useEffect(() => {
    // If auth query fails, redirect to login
    if (error) {
      localStorage.removeItem('authToken');
      setLocation('/login');
    }
  }, [error, setLocation]);

  useEffect(() => {
    // Update current page based on location
    const pageMap: { [key: string]: string } = {
      '/': 'Dashboard',
      '/users': 'Users',
      '/coins': 'Coin System',
      '/raffles': 'Raffles',
      '/shop': 'Shop',
      '/referrals': 'Referrals',
      '/logs': 'Transaction Logs',
      '/settings': 'Settings',
    };
    
    setCurrentPage(pageMap[location] || 'Dashboard');
  }, [location]);

  if (!admin) {
    return <CoinLoadingScreen message="Loading your dashboard..." />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card shadow-sm border-b border-border px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{currentPage}</h2>
              <p className="text-muted-foreground">
                {currentPage === 'Dashboard' && 'Overview of your Telegram bot performance'}
                {currentPage === 'Users' && 'Manage bot users and their information'}
                {currentPage === 'Coin System' && 'Monitor coin distribution and rewards'}
                {currentPage === 'Raffles' && 'Create and manage raffles'}
                {currentPage === 'Shop' && 'Manage shop items and purchases'}
                {currentPage === 'Referrals' && 'Track referral system performance'}
                {currentPage === 'Transaction Logs' && 'View all coin transactions'}
                {currentPage === 'Settings' && 'Configure bot settings'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Circle className="h-3 w-3 text-green-500 fill-current" />
                <span>Bot Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
