import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Plus, Users, Calendar, Coins } from "lucide-react";
import { useState } from "react";
import CreateRaffleModal from "@/components/modals/create-raffle-modal";
import ViewEntriesModal from "@/components/modals/view-entries-modal";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CoinLoadingCard } from "@/components/ui/coin-spinner";

export default function Raffles() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<any>(null);
  const [showEntriesModal, setShowEntriesModal] = useState(false);
  const { toast } = useToast();

  const { data: raffles = [], isLoading } = useQuery({
    queryKey: ['/api/raffles'],
  });

  const updateRaffleMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/raffles/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update raffle');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raffles'] });
      toast({
        title: "Success",
        description: "Raffle updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update raffle",
        variant: "destructive",
      });
    },
  });

  const handleToggleRaffle = (raffle: any) => {
    updateRaffleMutation.mutate({
      id: raffle.id,
      isActive: !raffle.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CoinLoadingCard message="Loading raffles..." />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Active Raffles</h3>
          <p className="text-gray-600">Manage your bot's raffle system</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Raffle
        </Button>
      </div>

      {/* Raffles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {raffles.map((raffle) => (
          <Card key={raffle.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{raffle.title}</CardTitle>
                <Badge variant={raffle.isActive ? "default" : "secondary"}>
                  {raffle.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{raffle.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gift className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Prize</span>
                  </div>
                  <span className="text-sm font-medium">{raffle.prizeDescription}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Entry Cost</span>
                  </div>
                  <span className="text-sm font-medium">{raffle.entryCost} coins</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Entries</span>
                  </div>
                  <span className="text-sm font-medium">
                    {raffle.currentEntries}
                    {raffle.maxEntries && `/${raffle.maxEntries}`}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Ends</span>
                  </div>
                  <span className="text-sm font-medium">
                    {new Date(raffle.endDate).toLocaleDateString()}
                  </span>
                </div>
                
                {raffle.winnerId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      🏆 Winner selected! User ID: {raffle.winnerId}
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleRaffle(raffle)}
                    disabled={updateRaffleMutation.isPending}
                  >
                    {raffle.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedRaffle(raffle);
                      setShowEntriesModal(true);
                    }}
                  >
                    View Entries
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {raffles.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No raffles yet</h3>
            <p className="text-gray-600 mb-4">Create your first raffle to engage your users</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Raffle
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateRaffleModal 
        open={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
      />
      
      <ViewEntriesModal
        open={showEntriesModal}
        onClose={() => {
          setShowEntriesModal(false);
          setSelectedRaffle(null);
        }}
        raffle={selectedRaffle}
      />
    </div>
  );
}
