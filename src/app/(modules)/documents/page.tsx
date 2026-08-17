'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FolderPlus, Upload, FileText, Search, Folder, ChevronRight, Download, 
  FileArchive, FileImage, FileSpreadsheet, Lock, Grid, List, Filter,
  ArrowUp, ArrowDown, ChevronLeft, ChevronRight as ChevronRightIcon, ExternalLink, Share2
} from 'lucide-react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { ShareDocumentModal } from './share-modal';

export default function DocumentsPage() {
  const [folders, setFolders] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<any | null>(null);
  const [folderPath, setFolderPath] = useState<any[]>([]);
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadIsRestricted, setUploadIsRestricted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // New states for enhanced functionality
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 50 });

  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [shareDocument, setShareDocument] = useState<any | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    try {
      const folderId = currentFolder?.id || '';
      
      // Fetch folders only if we are not searching globally
      if (!debouncedSearch && !filterType) {
        const folderQuery = folderId ? `?parentId=${folderId}` : '';
        const fRes = await fetch(`/api/documents/folders${folderQuery}`);
        if (fRes.ok) setFolders(await fRes.json());
      } else {
        setFolders([]); // Don't show folders during global search/filter
      }

      // Fetch documents with filters
      const params = new URLSearchParams();
      if (folderId && !debouncedSearch && !filterType) params.append('folderId', folderId);
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (filterType) params.append('type', filterType);
      params.append('sortBy', sortBy);
      params.append('page', currentPage.toString());
      params.append('limit', pagination.limit.toString());

      const dRes = await fetch(`/api/documents?${params.toString()}`);
      if (dRes.ok) {
        const data = await dRes.json();
        setDocuments(data.data);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentFolder, debouncedSearch, filterType, sortBy, currentPage, pagination.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolder?.id || null,
        }),
      });
      if (res.ok) {
        setIsFolderModalOpen(false);
        setNewFolderName('');
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle);
    formData.append('isRestricted', String(uploadIsRestricted));
    if (currentFolder) formData.append('folderId', currentFolder.id);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setIsUploadModalOpen(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadIsRestricted(false);
        fetchData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const navigateToFolder = (folder: any) => {
    setFolderPath([...folderPath, folder]);
    setCurrentFolder(folder);
    setSearchQuery('');
    setFilterType('');
    setCurrentPage(1);
  };

  const navigateUp = (index: number) => {
    if (index === -1) {
      setFolderPath([]);
      setCurrentFolder(null);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolder(newPath[newPath.length - 1]);
    }
    setSearchQuery('');
    setFilterType('');
    setCurrentPage(1);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <FileImage className="h-10 w-10 text-sky-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-10 w-10 text-rose-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="h-10 w-10 text-amber-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-10 w-10 text-emerald-500" />;
    return <FileText className="h-10 w-10 text-slate-500" />;
  };

  const getSmallFileIcon = (mimeType: string) => {
    if (mimeType.includes('image')) return <FileImage className="h-5 w-5 text-sky-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-rose-500" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <FileArchive className="h-5 w-5 text-amber-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
    return <FileText className="h-5 w-5 text-slate-500" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Document Repository</h2>
          <p className="text-slate-500">Securely manage and share corporate documents.</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setIsFolderModalOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> New Folder
          </Button>

          <Dialog open={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Create New Folder">
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div className="space-y-2">
                <Label>Folder Name</Label>
                <Input 
                  value={newFolderName} 
                  onChange={e => setNewFolderName(e.target.value)} 
                  placeholder="e.g. Q3 Financial Reports" 
                  required 
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsFolderModalOpen(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </Dialog>

          <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setIsUploadModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" /> Upload File
          </Button>

          <Dialog open={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Document">
            <form onSubmit={handleUploadFile} className="space-y-4">
              <div className="space-y-2">
                <Label>Document Title</Label>
                <Input 
                  value={uploadTitle} 
                  onChange={e => setUploadTitle(e.target.value)} 
                  placeholder="Document Title" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input 
                  type="file" 
                  onChange={e => setUploadFile(e.target.files?.[0] || null)} 
                  required 
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="restricted" 
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  checked={uploadIsRestricted}
                  onChange={e => setUploadIsRestricted(e.target.checked)}
                />
                <Label htmlFor="restricted" className="text-sm font-normal">Mark as Confidential (Restricts access)</Label>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Upload'}</Button>
              </DialogFooter>
            </form>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-1 items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              type="search" 
              placeholder="Search documents..." 
              className="pl-9 bg-slate-50" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <select 
              className="h-10 pl-3 pr-8 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
            >
              <option value="">All Types</option>
              <option value="pdf">PDFs</option>
              <option value="image">Images</option>
              <option value="spreadsheet">Spreadsheets</option>
              <option value="archive">Archives</option>
            </select>
            <Filter className="absolute right-2.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative">
            <select 
              className="h-10 pl-3 pr-8 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 appearance-none cursor-pointer"
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="size_desc">Largest First</option>
              <option value="size_asc">Smallest First</option>
            </select>
          </div>

          <div className="flex items-center border border-slate-200 rounded-md p-1 bg-slate-50">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-sm transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-sm transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-sky-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-1 text-sm font-medium text-slate-600">
            <button 
              onClick={() => navigateUp(-1)} 
              className={`hover:text-sky-600 hover:underline ${!currentFolder ? 'text-slate-900 font-semibold' : ''}`}
            >
              Repository
            </button>
            {folderPath.map((folder, idx) => (
              <div key={folder.id} className="flex items-center space-x-1">
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <button 
                  onClick={() => navigateUp(idx)} 
                  className={`hover:text-sky-600 hover:underline ${idx === folderPath.length - 1 ? 'text-slate-900 font-semibold' : ''}`}
                >
                  {folder.name}
                </button>
              </div>
            ))}
            {(debouncedSearch || filterType) && (
              <div className="flex items-center space-x-1">
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <span className="text-sky-600">Search Results</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {folders.length === 0 && documents.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <FolderTree className="h-12 w-12 text-slate-200 mb-4" />
              <p>{debouncedSearch || filterType ? 'No documents match your filters.' : 'This folder is empty.'}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-6">
              {/* Folders */}
              {folders.map(folder => (
                <div 
                  key={folder.id} 
                  onClick={() => navigateToFolder(folder)}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50 cursor-pointer transition-colors relative group"
                >
                  <Folder className={`h-12 w-12 mb-3 ${folder.isVirtual ? 'text-indigo-400 group-hover:text-indigo-500' : 'text-sky-400 group-hover:text-sky-500'}`} />
                  {folder.unreadCount > 0 && (
                    <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                      {folder.unreadCount}
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700 text-center line-clamp-2">{folder.name}</span>
                </div>
              ))}

              {/* Documents */}
              {documents.map(doc => (
                <div 
                  key={doc.id} 
                  onClick={() => setSelectedDocument(doc)}
                  className="flex flex-col items-center p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer transition-all relative group"
                >
                  {doc.isRestricted && (
                    <div className="absolute top-2 right-2 bg-rose-100 p-1 rounded-full">
                      <Lock className="h-3 w-3 text-rose-600" />
                    </div>
                  )}
                  {getFileIcon(doc.mimeType)}
                  <span className="text-sm font-medium text-slate-700 text-center line-clamp-2 mt-3 mb-1" title={doc.title}>{doc.title}</span>
                  <span className="text-xs text-slate-400">{formatSize(doc.size)}</span>
                  
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-slate-900/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <div className="bg-white rounded-full p-2 shadow-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                      <ExternalLink className="h-4 w-4 text-slate-700" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {folders.length > 0 && (
                <div className="p-4 bg-slate-50/50">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Folders</h4>
                  <div className="space-y-1">
                    {folders.map(folder => (
                      <div 
                        key={folder.id} 
                        onClick={() => navigateToFolder(folder)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <Folder className={`h-5 w-5 ${folder.isVirtual ? 'text-indigo-400' : 'text-sky-400'}`} />
                          <span className="text-sm font-medium text-slate-700">{folder.name}</span>
                        </div>
                        {folder.unreadCount > 0 && (
                          <div className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {folder.unreadCount} new
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {documents.length > 0 && (
                <div className="p-4">
                  {folders.length > 0 && <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Files</h4>}
                  <div className="space-y-1">
                    {documents.map(doc => (
                      <div 
                        key={doc.id} 
                        onClick={() => setSelectedDocument(doc)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {getSmallFileIcon(doc.mimeType)}
                          <span className="text-sm font-medium text-slate-700 truncate">{doc.title}</span>
                          {doc.isRestricted && <Lock className="h-3 w-3 text-rose-500 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center space-x-6 text-sm text-slate-500">
                          <span className="hidden md:inline-block w-24">{formatSize(doc.size)}</span>
                          <span className="hidden lg:inline-block w-24">{formatDate(doc.createdAt)}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="h-4 w-4 text-slate-400 hover:text-slate-700" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="border-t border-slate-100 p-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} documents
              </span>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <div className="text-sm font-medium text-slate-700 px-2">
                  Page {currentPage} of {pagination.totalPages}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === pagination.totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                >
                  Next <ChevronRightIcon className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Sheet */}
      <Sheet 
        open={!!selectedDocument} 
        onClose={() => setSelectedDocument(null)} 
        title="Document Preview" 
        className="w-full sm:max-w-2xl"
      >
        {selectedDocument && (
          <div className="flex flex-col h-full space-y-6 pb-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 break-words">{selectedDocument.title}</h3>
                <div className="flex items-center space-x-3 mt-2 text-sm text-slate-500">
                  <span>{formatSize(selectedDocument.size)}</span>
                  <span>•</span>
                  <span>{formatDate(selectedDocument.createdAt)}</span>
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Uploaded by: <span className="font-medium text-slate-700">{selectedDocument.uploaderName}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShareDocument(selectedDocument)}
                  className="h-10 px-4 py-2 shrink-0 border-sky-200 text-sky-700 hover:bg-sky-50"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <a 
                  href={selectedDocument.fileUrl} 
                  download={selectedDocument.fileName}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-sky-600 text-white hover:bg-sky-700 h-10 px-4 py-2 shrink-0"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </a>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
              {selectedDocument.mimeType.includes('image') ? (
                <img 
                  src={selectedDocument.fileUrl} 
                  alt={selectedDocument.title} 
                  className="max-w-full max-h-full object-contain"
                />
              ) : selectedDocument.mimeType.includes('pdf') ? (
                <iframe 
                  src={`${selectedDocument.fileUrl}#view=FitH`} 
                  className="w-full h-full border-0"
                  title={selectedDocument.title}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 space-y-4 p-8 text-center">
                  {getFileIcon(selectedDocument.mimeType)}
                  <p className="text-sm">Preview not available for this file type.</p>
                  <a 
                    href={selectedDocument.fileUrl} 
                    download={selectedDocument.fileName}
                    className="text-sky-600 hover:underline text-sm font-medium"
                  >
                    Download to view
                  </a>
                </div>
              )}
            </div>
            
            {selectedDocument.description && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                <p className="text-sm text-slate-700">{selectedDocument.description}</p>
              </div>
            )}
          </div>
        )}
      </Sheet>

      {/* Share Modal */}
      {shareDocument && (
        <ShareDocumentModal 
          document={shareDocument} 
          onClose={() => setShareDocument(null)} 
        />
      )}
    </div>
  );
}

// Just a fallback icon for the empty state
function FolderTree(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  )
}

