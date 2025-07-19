import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Search, Filter, Plus, Minus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { CoinLoadingCard } from "@/components/ui/coin-spinner";

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [adjustCoinDialog, setAdjustCoinDialog] = useState<{
    open: boolean;
    user: any | null;
    type: 'add' | 'withdraw';
  }>({ open: false, user: null, type: 'add' });
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const adjustCoinsMutation = useMutation({
    mutationFn: async ({ userId, amount, type, reason }: { userId: number; amount: number; type: 'add' | 'withdraw'; reason: string }) => {
      const response = await apiRequest('POST', `/api/users/${userId}/adjust-coins`, { amount, type, reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'Coins adjusted successfully',
      });
      setAdjustCoinDialog({ open: false, user: null, type: 'add' });
      setAdjustAmount('');
      setAdjustReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to adjust coins',
        variant: 'destructive',
      });
    },
  });

  const handleAdjustCoins = () => {
    if (!adjustCoinDialog.user || !adjustAmount || !adjustReason) return;

    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    adjustCoinsMutation.mutate({
      userId: adjustCoinDialog.user.id,
      amount,
      type: adjustCoinDialog.type,
      reason: adjustReason,
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telegramId.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card>
        <CoinLoadingCard message="Loading users..." />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('all')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterStatus === 'active' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('active')}
            size="sm"
          >
            Active
          </Button>
          <Button
            variant={filterStatus === 'inactive' ? 'default' : 'outline'}
            onClick={() => setFilterStatus('inactive')}
            size="sm"
          >
            Inactive
          </Button>
        </div>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Telegram ID</th>
                  <th className="pb-3">Coins</th>
                  <th className="pb-3">Referral Code</th>
                  <th className="pb-3">Last Daily</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Joined</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <UsersIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.firstName || user.username || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{user.username || user.telegramId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <code className="text-sm bg-gray-100 dark:bg-gray-800 dark:text-white px-2 py-1 rounded">
                        {user.telegramId}
                      </code>
                    </td>
                    <td className="py-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.coins}
                      </span>
                    </td>
                    <td className="py-3">
                      <code className="text-sm bg-blue-100 dark:bg-blue-900 dark:text-white px-2 py-1 rounded">
                        {user.referralCode}
                      </code>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {user.lastDailyReward 
                          ? new Date(user.lastDailyReward).toLocaleDateString()
                          : 'Never'
                        }
                      </span>
                    </td>
                    <td className="py-3">
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjustCoinDialog({ open: true, user, type: 'add' })}
                        >
                          <Plus className="h-4 w-4" />
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setAdjustCoinDialog({ open: true, user, type: 'withdraw' })}
                        >
                          <Minus className="h-4 w-4" />
                          Withdraw
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adjust Coins Dialog */}
      <Dialog open={adjustCoinDialog.open} onOpenChange={(open) => !open && setAdjustCoinDialog({ open: false, user: null, type: 'add' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {adjustCoinDialog.type === 'add' ? 'Add' : 'Withdraw'} Coins - {adjustCoinDialog.user?.firstName || adjustCoinDialog.user?.username || 'User'}
            </DialogTitle>
            <DialogDescription>
              Current balance: {adjustCoinDialog.user?.coins || 0} coins
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Enter reason for adjustment"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAdjustCoinDialog({ open: false, user: null, type: 'add' });
                  setAdjustAmount('');
                  setAdjustReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAdjustCoins}
                disabled={adjustCoinsMutation.isPending}
              >
                {adjustCoinsMutation.isPending ? 'Processing...' : `${adjustCoinDialog.type === 'add' ? 'Add' : 'Withdraw'} Coins`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
