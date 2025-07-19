import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BroadcastMessageModalProps {
  open: boolean;
  onClose: () => void;
}

export default function BroadcastMessageModal({ open, onClose }: BroadcastMessageModalProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const broadcastMutation = useMutation({
    mutationFn: async (data: { message: string }) => {
      const response = await apiRequest('POST', '/api/broadcast', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Message Sent Successfully",
        description: `Sent to ${data.success} users, failed for ${data.failed} users.`,
      });
      setMessage("");
      onClose();
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Broadcast Failed",
        description: error.message || "Failed to send announcement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      broadcastMutation.mutate({ message: message.trim() });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Announcement to All Users</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This message will be sent to all active users via Telegram bot.
              Make sure your message is clear and appropriate.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="message">Announcement Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your announcement message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              maxLength={4096}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/4096 characters
            </p>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!message.trim() || broadcastMutation.isPending}>
              {broadcastMutation.isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Announcement
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}