import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Users, TrendingUp } from "lucide-react";

export default function Referrals() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/transactions'],
  });

  // Calculate referral statistics
  const referralTransactions = transactions.filter(t => t.type === 'referral');
  const totalReferrals = referralTransactions.length;
  const uniqueReferrers = new Set(referralTransactions.map(t => t.userId)).size;
  
  const usersWithReferrals = users.filter(user => user.referredBy);
  const usersWithoutReferrals = users.filter(user => !user.referredBy);

  // Top referrers
  const referralCounts = users.reduce((acc, user) => {
    if (user.referredBy) {
      acc[user.referredBy] = (acc[user.referredBy] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topReferrers = Object.entries(referralCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([referralCode, count]) => {
      const referrer = users.find(u => u.referralCode === referralCode);
      return { referrer, count };
    });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Referrals</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalReferrals}</p>
                <p className="text-sm text-green-600 dark:text-green-400">rewards given</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Referrers</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{uniqueReferrers}</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">users referring</p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Referral Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {users.length > 0 ? Math.round((usersWithReferrals.length / users.length) * 100) : 0}%
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-400">of all users</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Referrers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <UserPlus className="h-5 w-5" />
            Top Referrers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topReferrers.map(({ referrer, count }, index) => (
              <div key={referrer?.id || index} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {referrer?.firstName && referrer?.lastName 
                        ? `${referrer.firstName} ${referrer.lastName}`
                        : referrer?.firstName || referrer?.username || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Code: {referrer?.referralCode || 'N/A'}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {count} referral{count !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
          
          {topReferrers.length === 0 && (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No referrals yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Acquisition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Via Referral</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{usersWithReferrals.length}</span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({users.length > 0 ? Math.round((usersWithReferrals.length / users.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Direct</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-900">{usersWithoutReferrals.length}</span>
                  <span className="text-xs text-gray-500 ml-1">
                    ({users.length > 0 ? Math.round((usersWithoutReferrals.length / users.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Referral Rewards</span>
                <span className="text-sm font-medium text-gray-900">{totalReferrals} coins</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average per Referrer</span>
                <span className="text-sm font-medium text-gray-900">
                  {uniqueReferrers > 0 ? Math.round(totalReferrals / uniqueReferrers) : 0} coins
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Most Referrals</span>
                <span className="text-sm font-medium text-gray-900">
                  {topReferrers.length > 0 ? topReferrers[0].count : 0} users
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usersWithReferrals.slice(0, 10).map((referredUser) => {
              const referrer = users.find(u => u.referralCode === referredUser.referredBy);
              return (
                <div key={referredUser.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {referredUser.firstName && referredUser.lastName 
                        ? `${referredUser.firstName} ${referredUser.lastName}`
                        : referredUser.firstName || referredUser.username || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Referred by: {referrer?.firstName && referrer?.lastName 
                        ? `${referrer.firstName} ${referrer.lastName}`
                        : referrer?.firstName || referrer?.username || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Code: {referredUser.referredBy}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {usersWithReferrals.length === 0 && (
              <div className="text-center py-8">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No referrals yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
