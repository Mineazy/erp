import { useState, useEffect } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectOption } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { Folder } from 'lucide-react';

export function useReportExport() {
  const [isOpen, setIsOpen] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [exportName, setExportName] = useState('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');

  const triggerExport = (url: string, name: string, options?: { isRestricted?: boolean }) => {
    setExportUrl(url);
    setExportName(name);
    setIsRestricted(!!options?.isRestricted);
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      // Fetch folders
      const fetchFolders = async () => {
        try {
          const res = await fetch('/api/documents/folders');
          if (res.ok) {
            const data = await res.json();
            setFolders(data);
          }
        } catch (e) {
          console.error('Failed to fetch folders', e);
        }
      };
      fetchFolders();
    }
  }, [isOpen]);

  const handleDownloadOnly = () => {
    // Use window.open first (preview), fallback to anchor — works in both web and Tauri WebView2
    // Do not use Tauri shell plugin to avoid extra dep; WebView2 handles blob URLs
    let win: Window | null = null;
    try {
      win = window.open(exportUrl, '_blank', 'noopener');
    } catch {}
    if (!win) {
      try {
        const a = document.createElement('a');
        a.href = exportUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Fallback download if preview still blocked
        setTimeout(() => {
          try {
            const dl = document.createElement('a');
            dl.href = exportUrl;
            dl.download = `${exportName}.pdf`;
            document.body.appendChild(dl);
            dl.click();
            document.body.removeChild(dl);
          } catch {}
        }, 150);
      } catch {
        // Last resort: navigate current window (will download)
        window.location.href = exportUrl;
      }
    }
    setTimeout(() => setIsOpen(false), 300);
  };

  const handleSaveToDocuments = async () => {
    setIsProcessing(true);
    try {
      // Create naming convention: ReportName_YYYY-MM-DD_HH-mm
      const date = new Date();
      const formattedDate = date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0') + '_' +
        String(date.getHours()).padStart(2, '0') + '-' +
        String(date.getMinutes()).padStart(2, '0');
        
      const sanitizedName = exportName.replace(/[^a-zA-Z0-9 -]/g, '').trim().replace(/\s+/g, '_');
      const finalFileName = `${sanitizedName}_${formattedDate}.pdf`; // Assume pdf/html based on content type? Wait, fetch will tell us

      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error('Failed to fetch report');
      
      const blob = await res.blob();
      const extension = blob.type === 'text/csv' ? 'csv' : 
                        blob.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? 'xlsx' : 
                        blob.type === 'text/html' ? 'html' : 'pdf';
                        
      const fileWithExt = `${sanitizedName}_${formattedDate}.${extension}`;

      const file = new File([blob], fileWithExt, { type: blob.type });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', fileWithExt);
      if (selectedFolderId) {
        formData.append('folderId', selectedFolderId);
      }
      if (isRestricted) {
        formData.append('isRestricted', 'true');
      }

      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (uploadRes.ok) {
        toast('Report saved to Documents successfully!', 'success');
        setIsOpen(false);
      } else {
        const err = await uploadRes.json();
        toast(`Failed to save report: ${err.error || 'Unknown error'}`, 'error');
      }
    } catch (e) {
      console.error(e);
      toast('An error occurred while saving the report.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const folderOptions: SelectOption[] = folders.map(f => ({
    value: f.id,
    label: f.name
  }));

  const ExportDialog = (
    <Dialog open={isOpen} onClose={() => setIsOpen(false)} title="Export Options">
      <div className="space-y-6">
        <p className="text-sm text-slate-600">
          How would you like to handle <strong>{exportName}</strong>?
        </p>
        {exportUrl && exportUrl.startsWith('blob:') && (
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-slate-50 px-3 py-2 border-b flex justify-between items-center">
              <span className="text-xs font-medium text-slate-700">Preview</span>
              <a href={exportUrl} target="_blank" rel="noopener" className="text-xs text-mine-blue-700 hover:underline">Open in new tab ↗</a>
            </div>
            <iframe src={exportUrl} className="w-full h-[400px] border-0" title="PDF Preview" />
          </div>
        )}

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 font-medium mb-2">
            <Folder className="h-5 w-5 text-mine-blue-500" />
            <span>Save to Documents Repository</span>
          </div>
          {!isRestricted && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Save to Folder</label>
              <Select
                options={[
                  { value: '', label: 'Root Folder' },
                  { value: 'shared-documents', label: 'Shared Documents' },
                  ...folderOptions
                ]}
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
              />
            </div>
          )}
          <Button 
            onClick={handleSaveToDocuments} 
            disabled={isProcessing}
            className="w-full bg-mine-blue-600 hover:bg-mine-blue-700 text-white"
          >
            {isProcessing ? 'Saving...' : 'Save to Documents'}
          </Button>
        </div>

        <div className="flex items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">OR</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <Button 
          variant="outline" 
          onClick={handleDownloadOnly} 
          disabled={isProcessing}
          className="w-full"
        >
          Download Only (Browser)
        </Button>
      </div>
    </Dialog>
  );

  return { triggerExport, ExportDialog };
}
