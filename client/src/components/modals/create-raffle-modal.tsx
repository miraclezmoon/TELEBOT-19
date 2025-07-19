import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface CreateRaffleModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreateRaffleModal({ open, onClose }: CreateRaffleModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prizeDescription: '',
    entryCost: 10,
    maxEntries: null as number | null,
    startDate: '',
    endDate: '',
  });

  const createRaffleMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/raffles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          startDate: data.startDate ? new Date(data.startDate).toISOString() : new Date().toISOString(),
          endDate: new Date(data.endDate).toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create raffle');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raffles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Raffle created successfully",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create raffle",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      prizeDescription: '',
      entryCost: 10,
      maxEntries: null,
      startDate: '',
      endDate: '',
    });
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.prizeDescription || !formData.endDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const endDate = new Date(formData.endDate);
    if (endDate <= new Date()) {
      toast({
        title: "Validation Error",
        description: "End date must be in the future",
        variant: "destructive",
      });
      return;
    }

    createRaffleMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Generate minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 16);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Raffle</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Raffle Title *</Label>
            <Input
              id="title"
              placeholder="Enter raffle title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the raffle (optional)"
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prizeDescription">Prize Description *</Label>
            <Textarea
              id="prizeDescription"
              placeholder="Describe the prize"
              rows={3}
              value={formData.prizeDescription}
              onChange={(e) => handleInputChange('prizeDescription', e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryCost">Entry Cost (Coins) *</Label>
              <Input
                id="entryCost"
                type="number"
                min="1"
                max="1000"
                value={formData.entryCost}
                onChange={(e) => handleInputChange('entryCost', parseInt(e.target.value))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxEntries">Max Entries</Label>
              <Input
                id="maxEntries"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={formData.maxEntries || ''}
                onChange={(e) => handleInputChange('maxEntries', e.target.value ? parseInt(e.target.value) : null)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date & Time</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date & Time *</Label>
              <Input
                id="endDate"
                type="datetime-local"
                min={minDate}
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={handleClose}
              disabled={createRaffleMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createRaffleMutation.isPending}
            >
              {createRaffleMutation.isPending ? 'Creating...' : 'Create Raffle'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
