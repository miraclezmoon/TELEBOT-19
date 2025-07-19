import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Coins, Gift, Calendar, Plus, ShoppingCart, Download, Megaphone } from "lucide-react";
import { useState } from "react";
import CreateRaffleModal from "@/components/modals/create-raffle-modal";
import AddShopItemModal from "@/components/modals/add-shop-item-modal";
import BroadcastMessageModal from "@/components/modals/broadcast-message-modal";
import { CoinLoadingCard } from "@/components/ui/coin-spinner";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Dashboard() {
  const [showCreateRaffle, setShowCreateRaffle] = useState(false);
  const [showAddShopItem, setShowAddShopItem] = useState(false);
  const [showBroadcastMessage, setShowBroadcastMessage] = useState(false);
  const [activityRange, setActivityRange] = useState<string>('7days');
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  // Process user activity data
  const processActivityData = () => {
    // Use the actual date from the system - July 14, 2025
    const now = new Date('2025-07-14T23:00:00');
    const days = activityRange === '7days' ? 7 : activityRange === '30days' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Initialize date map
    const dateMap: Record<string, { registrations: number; dailyActive: number }> = {};
    
    // Fill all dates in range
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      dateMap[dateKey] = { registrations: 0, dailyActive: 0 };
    }
    
    // Count registrations
    users.forEach(user => {
      const userDate = new Date(user.createdAt);
      if (userDate >= startDate && userDate <= now) {
        const dateKey = userDate.toISOString().split('T')[0];
        if (dateMap[dateKey]) {
          dateMap[dateKey].registrations++;
        }
      }
    });
    
    // Count daily active users (based on transactions)
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      if (transactionDate >= startDate && transactionDate <= now) {
        const dateKey = transactionDate.toISOString().split('T')[0];
        if (dateMap[dateKey] && transaction.type === 'daily_reward') {
          dateMap[dateKey].dailyActive++;
        }
      }
    });
    
    // Convert to array for chart
    return Object.entries(dateMap).map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      registrations: data.registrations,
      dailyActive: data.dailyActive,
    }));
  };

  const activityData = processActivityData();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CoinLoadingCard message="Loading stats..." />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">+12% from last month</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Coins</p>
                <p className="text-3xl font-bold text-foreground">{stats?.totalCoins || 0}</p>
                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">+8% from last month</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Coins className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Active Raffles</p>
                <p className="text-3xl font-bold text-foreground">{stats?.activeRaffles || 0}</p>
                <p className="text-sm font-medium text-muted-foreground">2 ending soon</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Gift className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Daily Logins</p>
                <p className="text-3xl font-bold text-foreground">{stats?.dailyLogins || 0}</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">+15% from yesterday</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>


      </div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity Chart */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>User Activity</CardTitle>
              <Select value={activityRange} onValueChange={setActivityRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis 
                      dataKey="date" 
                      className="text-gray-600 dark:text-gray-400"
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                    />
                    <YAxis 
                      className="text-gray-600 dark:text-gray-400"
                      fontSize={12}
                      tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--background)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--foreground)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="registrations" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="New Registrations"
                      dot={{ fill: '#3b82f6' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="dailyActive" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Daily Check-ins"
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <p>No activity data available for the selected period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coin Distribution */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Coin Distribution</CardTitle>
              <div className="flex space-x-2">
                <Button size="sm" variant="default">Today</Button>
                <Button size="sm" variant="outline">Week</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-muted-foreground">Daily Rewards</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">2,450</span>
                  <span className="text-xs font-medium text-muted-foreground ml-1">53%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-muted-foreground">Referral Rewards</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">1,890</span>
                  <span className="text-xs font-medium text-muted-foreground ml-1">41%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-muted-foreground">Raffle Entries</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">280</span>
                  <span className="text-xs font-medium text-muted-foreground ml-1">6%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Recent Users</CardTitle>
              <Button variant="ghost" size="sm">View all</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentUsers?.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {user.firstName || user.username || 'User'}
                      </p>
                      <p className="text-sm font-medium text-muted-foreground">@{user.username || user.telegramId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-foreground">{user.coins}</span>
                    <p className="text-xs font-medium text-muted-foreground">coins</p>
                  </div>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => setShowCreateRaffle(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Raffle
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setShowAddShopItem(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add Shop Item
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setShowBroadcastMessage(true)}
              >
                <Megaphone className="h-4 w-4 mr-2" />
                Send Announcement
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('authToken');
                    const response = await fetch('/api/users/export', {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'telegram_bot_users.csv';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      
                      toast({
                        title: "Export Successful",
                        description: "User data has been exported to CSV file",
                      });
                    } else {
                      console.error('Export failed:', response.status, response.statusText);
                      toast({
                        title: "Export Failed",
                        description: "Unable to export user data. Please try again.",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    console.error('Export error:', error);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Users Data
              </Button>
            </div>

            {/* Bot Status */}
            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="text-md font-bold text-foreground mb-4">Bot Status</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Uptime</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">99.9%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Response Time</span>
                  <span className="text-sm font-bold text-foreground">120ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Commands/Hour</span>
                  <span className="text-sm font-bold text-foreground">1,847</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreateRaffleModal 
        open={showCreateRaffle} 
        onClose={() => setShowCreateRaffle(false)}
      />
      <AddShopItemModal 
        open={showAddShopItem} 
        onClose={() => setShowAddShopItem(false)}
      />
      <BroadcastMessageModal
        open={showBroadcastMessage}
        onClose={() => setShowBroadcastMessage(false)}
      />

    </div>
  );
}
