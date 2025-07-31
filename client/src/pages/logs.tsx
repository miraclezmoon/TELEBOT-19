import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Search, Filter, Download, Activity, TrendingUp, BarChart3 } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [activityRange, setActivityRange] = useState<string>('7days');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['/api/transactions'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  // Create a map of user IDs to user data for quick lookup
  const userMap = users.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {} as Record<number, any>);

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

  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const user = userMap[transaction.userId];
    const userName = user?.firstName || user?.username || user?.telegramId || '';
    
    const matchesSearch = searchTerm === '' || 
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || transaction.type === filterType;
    
    let matchesDate = true;
    if (filterDateRange !== 'all') {
      const transactionDate = new Date(transaction.createdAt);
      const now = new Date();
      
      switch (filterDateRange) {
        case 'today':
          matchesDate = transactionDate.toDateString() === now.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = transactionDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  const transactionTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'daily_reward', label: 'Daily Rewards' },
    { value: 'referral', label: 'Referral Rewards' },
    { value: 'raffle_entry', label: 'Raffle Entries' },
    { value: 'shop_purchase', label: 'Shop Purchases' },
    { value: 'admin_adjustment', label: 'Admin Adjustments' },
  ];

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'daily_reward': return 'default';
      case 'referral': return 'secondary';
      case 'raffle_entry': return 'destructive';
      case 'shop_purchase': return 'outline';
      case 'admin_adjustment': return 'secondary';
      default: return 'outline';
    }
  };

  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case 'daily_reward': return 'Daily Reward';
      case 'referral': return 'Referral';
      case 'raffle_entry': return 'Raffle Entry';
      case 'shop_purchase': return 'Shop Purchase';
      case 'admin_adjustment': return 'Admin Adjustment';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Activity Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <BarChart3 className="h-5 w-5" />
              User Activity
            </CardTitle>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Transaction Type" />
          </SelectTrigger>
          <SelectContent>
            {transactionTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterDateRange} onValueChange={setFilterDateRange}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="default">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Transaction Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredTransactions.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredTransactions.filter(t => t.amount > 0).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Coins Earned</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {filteredTransactions.filter(t => t.amount < 0).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Coins Spent</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {filteredTransactions.reduce((sum, t) => sum + t.amount, 0)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Net Change</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Description</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const user = userMap[transaction.userId];
                  return (
                    <tr key={transaction.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(transaction.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </td>
                      <td className="py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user?.firstName || user?.username || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            @{user?.username || user?.telegramId || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant={getTransactionTypeColor(transaction.type)}>
                          {getTransactionTypeName(transaction.type)}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className={`text-sm font-medium ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </span>
                      </td>
                      <td className="py-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {transaction.description || 'No description'}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No transactions found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
