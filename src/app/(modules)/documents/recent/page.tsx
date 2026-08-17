'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, Download, Lock, FileArchive, FileImage, FileCode2, FileSpreadsheet, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function RecentDocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        // Fetch all documents and sort by date in the client, or use the default endpoint which sorts by createdAt desc
        const res = await fetch('/api/documents');
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.slice(0, 50)); // Only show top 50 recent
        }
      } catch (error) {
        console.error('Failed to fetch recent documents', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRecent();
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <FileImage className="h-6 w-6 text-sky-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-6 w-6 text-rose-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="h-6 w-6 text-amber-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-6 w-6 text-emerald-500" />;
    return <FileText className="h-6 w-6 text-slate-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center">
          <Clock className="mr-3 h-8 w-8 text-sky-500" />
          Recent Files
        </h2>
        <p className="text-slate-500 mt-1">Recently uploaded or modified documents across all folders.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">Loading recent files...</div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <FileText className="h-12 w-12 text-slate-200 mb-3" />
                <p>No documents found.</p>
              </div>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      {getFileIcon(doc.mimeType)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <a href={doc.fileUrl} target="_blank" className="font-medium text-slate-900 hover:text-sky-600 hover:underline">
                          {doc.title}
                        </a>
                        {doc.isRestricted && <Lock className="h-3 w-3 text-rose-500" />}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        <span>{formatSize(doc.size)}</span>
                        <span>•</span>
                        <span>Uploaded by {doc.uploaderName}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}</span>
                        {doc.folder && (
                          <>
                            <span>•</span>
                            <span className="bg-slate-200 px-2 py-0.5 rounded-full">{doc.folder.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={doc.fileUrl} target="_blank" download className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 flex text-slate-600">
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
