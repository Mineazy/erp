import { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, X, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export function ShareDocumentModal({ document, onClose }: { document: any, onClose: () => void }) {
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  
  const fetchShares = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/documents/${document.id}/shares`);
      if (res.ok) {
        const data = await res.json();
        setShares(data);
      } else {
        toast('Failed to load shares', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (document) {
      fetchShares();
    }
  }, [document]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          // Filter out users who already have access
          const existingUserIds = new Set(shares.map(s => s.user.id));
          existingUserIds.add(document.uploadedBy); // And owner
          const filtered = (data.items || data).filter((u: any) => !existingUserIds.has(u.id));
          setSearchResults(filtered);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, shares, document]);

  const handleShare = async (user: any) => {
    try {
      const res = await fetch(`/api/documents/${document.id}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [user.id] })
      });
      if (res.ok) {
        toast(`Shared with ${user.name}`, 'success');
        setSearch('');
        fetchShares();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to share document', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      const res = await fetch(`/api/documents/${document.id}/shares/${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast('Access revoked', 'success');
        fetchShares();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to revoke access', 'error');
      }
    } catch (e) {
      toast('Network error', 'error');
    }
  };

  return (
    <Dialog open={!!document} onClose={onClose} title="Share Document">
      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-1">Add People</h4>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by name or email..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9"
            />
          </div>
          
          {search.trim() && (
            <div className="mt-2 border border-slate-100 rounded-md overflow-hidden bg-white shadow-sm max-h-48 overflow-y-auto">
              {searching ? (
                <div className="p-3 text-sm text-slate-500 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-sm text-slate-500 text-center">No matching users found</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {searchResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => handleShare(u)}>
                        <UserPlus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-3">People with access</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-semibold text-slate-600 text-sm">
                  {document.uploaderName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{document.uploaderName} <span className="text-xs text-slate-400 ml-1">(Owner)</span></p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-4 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading shares...
              </div>
            ) : shares.map(share => (
              <div key={share.id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center font-semibold text-sky-600 text-sm">
                    {share.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{share.user.name}</p>
                    <p className="text-xs text-slate-500">{share.user.email}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={() => handleRemoveShare(share.user.id)}
                  title="Revoke access"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter className="mt-6 border-t border-slate-100 pt-4">
        <Button onClick={onClose} className="w-full sm:w-auto">Done</Button>
      </DialogFooter>
    </Dialog>
  );
}
