import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Save, Key, Coins, Users, Bot, AlertTriangle, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { toast } = useToast();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [formData, setFormData] = useState({
    botToken: '',
    dailyRewardAmount: 1,
    referralRewardAmount: 1,
    maxRaffleEntries: 100,
    shopEnabled: true,
    rafflesEnabled: true,
    referralsEnabled: true,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/settings'],
  });

  const resetUserPointsMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/users/reset-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset user points');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "All user points have been reset to 0",
      });
      setShowResetDialog(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset user points",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        botToken: settings.botToken || '',
        dailyRewardAmount: settings.dailyRewardAmount || 1,
        referralRewardAmount: settings.referralRewardAmount || 1,
      }));
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bot Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Bot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="botToken">Bot Token</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="botToken"
                  type="password"
                  placeholder="Enter your Telegram bot token"
                  value={formData.botToken}
                  onChange={(e) => handleInputChange('botToken', e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-sm text-gray-600">
                Get your bot token from @BotFather on Telegram
              </p>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bot Status</Label>
                <p className="text-sm text-gray-600">Current bot operational status</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Online</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reward Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Reward Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dailyReward">Daily Reward Amount</Label>
                <Input
                  id="dailyReward"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.dailyRewardAmount}
                  onChange={(e) => handleInputChange('dailyRewardAmount', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-600">Coins given for daily check-in</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="referralReward">Referral Reward Amount</Label>
                <Input
                  id="referralReward"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.referralRewardAmount}
                  onChange={(e) => handleInputChange('referralRewardAmount', parseInt(e.target.value))}
                />
                <p className="text-sm text-gray-600">Coins given for successful referrals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Feature Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Shop System</Label>
                <p className="text-sm text-gray-600">Allow users to purchase items with coins</p>
              </div>
              <Switch
                checked={formData.shopEnabled}
                onCheckedChange={(checked) => handleInputChange('shopEnabled', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Raffle System</Label>
                <p className="text-sm text-gray-600">Enable raffle entries and management</p>
              </div>
              <Switch
                checked={formData.rafflesEnabled}
                onCheckedChange={(checked) => handleInputChange('rafflesEnabled', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Referral System</Label>
                <p className="text-sm text-gray-600">Allow users to invite friends for rewards</p>
              </div>
              <Switch
                checked={formData.referralsEnabled}
                onCheckedChange={(checked) => handleInputChange('referralsEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">99.9%</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Uptime</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">120ms</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Response Time</p>
              </div>
              
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">v2.1.0</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bot Version</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-900">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">Reset All User Points</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will reset all user coin balances to 0. This action cannot be undone.
                  </p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => setShowResetDialog(true)}
                  className="min-w-32"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Points
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={updateSettingsMutation.isPending}
            className="min-w-32"
          >
            {updateSettingsMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </div>
            )}
          </Button>
        </div>
      </form>

      {/* Reset Points Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will reset all user coin balances to 0. All users will lose their accumulated coins.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetUserPointsMutation.mutate()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {resetUserPointsMutation.isPending ? 'Resetting...' : 'Reset All Points'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
