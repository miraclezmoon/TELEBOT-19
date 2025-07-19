import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Plus, Package, Coins } from "lucide-react";
import { useState } from "react";
import AddShopItemModal from "@/components/modals/add-shop-item-modal";
import EditShopItemModal from "@/components/modals/edit-shop-item-modal";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CoinLoadingCard } from "@/components/ui/coin-spinner";

export default function Shop() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['/api/shop'],
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/shop/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shop'] });
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const handleToggleItem = (item: any) => {
    updateItemMutation.mutate({
      id: item.id,
      isActive: !item.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CoinLoadingCard message="Loading shop items..." />
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
          <h3 className="text-lg font-semibold">Shop Items</h3>
          <p className="text-gray-600">Manage items users can purchase with coins</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <Card key={item.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <Badge variant={item.isActive ? "default" : "secondary"}>
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {item.description && (
                <p className="text-sm text-gray-600">{item.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {item.imageUrl && (
                  <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="max-w-full max-h-full object-cover rounded-lg"
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Coins className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Cost</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{item.cost} coins</span>
                </div>
                
                {item.stock !== null && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Stock</span>
                    </div>
                    <span className="text-sm font-medium">
                      {item.stock > 0 ? `${item.stock} available` : 'Out of stock'}
                    </span>
                  </div>
                )}
                
                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleItem(item)}
                    disabled={updateItemMutation.isPending}
                  >
                    {item.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {items.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No items yet</h3>
            <p className="text-gray-600 mb-4">Add items to your shop for users to purchase</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card>
      )}

      <AddShopItemModal 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)}
      />
      
      <EditShopItemModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
      />
    </div>
  );
}
