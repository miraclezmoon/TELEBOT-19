import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

interface ViewEntriesModalProps {
  open: boolean;
  onClose: () => void;
  raffle: any;
}

export default function ViewEntriesModal({ open, onClose, raffle }: ViewEntriesModalProps) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: [`/api/raffles/${raffle?.id}/entries`],
    enabled: !!raffle?.id && open,
  });

  if (!raffle) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Raffle Entries - {raffle.title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Entries:</span>
            <Badge variant="secondary">{entries.length}</Badge>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading entries...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No entries yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {entries.map((entry: any, index: number) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                      <div>
                        <p className="font-medium">
                          {entry.user?.firstName || entry.user?.lastName 
                            ? `${entry.user.firstName || ''} ${entry.user.lastName || ''}`.trim()
                            : entry.user?.username || `User ${entry.userId}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {entry.user?.username && `@${entry.user.username} • `}
                          Entered: {new Date(entry.createdAt).toLocaleString('en-US', { 
                            timeZone: 'America/Los_Angeles',
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                    </div>
                    {raffle.winnerId === entry.userId && (
                      <Badge variant="default" className="bg-green-500">
                        🏆 Winner
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {entries.length > 0 && !raffle.winnerId && raffle.status === 'completed' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ This raffle has ended but no winner has been selected yet.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}