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
import { toast } from '@/components/ui/toast';
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
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadIsRestricted, setUploadIsRestricted] = useState(false);
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('files');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // New states for enhanced functionality
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

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
        const fRes = await fetch(`/api/documents/folders${folderQuery}`, { cache: 'no-store' });
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

      const dRes = await fetch(`/api/documents?${params.toString()}`, { cache: 'no-store' });
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
        toast('Folder created successfully', 'success');
      } else {
        toast('Failed to create folder', 'error');
      }
    } catch (error) {
      console.error(error);
      toast('An error occurred while creating folder', 'error');
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFiles || uploadFiles.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress({ current: 0, total: uploadFiles.length });

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        
        // 5MB limit check
        if (file.size > 5 * 1024 * 1024) {
          toast(`File ${file.name} exceeds the 5MB limit`, 'error');
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);
        
        // If uploading multiple, use the file's original name, else use the custom title
        const titleToUse = uploadFiles.length > 1 ? file.name : (uploadTitle || file.name);
        formData.append('title', titleToUse);
        formData.append('isRestricted', String(uploadIsRestricted));
        
        if (currentFolder) formData.append('folderId', currentFolder.id);
        
        // If it's a folder upload, it will have webkitRelativePath
        if (file.webkitRelativePath) {
          formData.append('relativePath', file.webkitRelativePath);
        }

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          setUploadProgress(prev => ({ ...prev, current: prev.current + 1 }));
        } else {
          toast(`Failed to upload ${file.name}`, 'error');
        }
      }

      setIsUploadModalOpen(false);
      setUploadFiles([]);
      setUploadTitle('');
      setUploadIsRestricted(false);
      setUploadProgress({ current: 0, total: 0 });
      fetchData();
      toast('Upload completed successfully', 'success');
    } catch (error) {
      console.error(error);
      toast('An error occurred during upload', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocuments = async (ids: string[]) => {
    if (!confirm(`Are you sure you want to delete ${ids.length} document(s)?`)) return;
    
    setIsDeleting(true);
    try {
      const isSharedFolder = currentFolder?.id === 'shared-documents';
      const url = isSharedFolder ? '/api/documents?action=unshare' : '/api/documents';
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: ids }),
      });
      if (res.ok) {
        setSelectedDocumentIds([]);
        if (selectedDocument && ids.includes(selectedDocument.id)) {
          setSelectedDocument(null);
        }
        fetchData();
        toast(`Successfully deleted ${ids.length} document(s)`, 'success');
      } else {
        const err = await res.json();
        toast(`Failed to delete: ${err.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error(error);
      toast('An error occurred while deleting documents', 'error');
    } finally {
      setIsDeleting(false);
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
          {selectedDocumentIds.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteDocuments(selectedDocumentIds)}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? 'Deleting...' : `Delete Selected (${selectedDocumentIds.length})`}
            </Button>
          )}
          {currentFolder?.id !== 'shared-documents' && (
            <>
              <Button variant="outline" onClick={() => setIsFolderModalOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" /> New Folder
              </Button>
              <Button className="bg-sky-600 hover:bg-sky-700" onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Upload File
              </Button>
            </>
          )}

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

          <Dialog open={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Document">
            <form onSubmit={handleUploadFile} className="space-y-4">
              <div className="flex border-b border-slate-200 mb-4">
                <button
                  type="button"
                  onClick={() => { setUploadMode('files'); setUploadFiles([]); }}
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${uploadMode === 'files' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  Upload Files
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadMode('folder'); setUploadFiles([]); }}
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${uploadMode === 'folder' ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  Upload Folder
                </button>
              </div>

              {uploadMode === 'files' && uploadFiles.length <= 1 && (
                <div className="space-y-2">
                  <Label>Document Title (Optional)</Label>
                  <Input 
                    value={uploadTitle} 
                    onChange={e => setUploadTitle(e.target.value)} 
                    placeholder={uploadFiles.length === 1 ? uploadFiles[0].name : "Document Title"} 
                  />
                  {uploadFiles.length > 1 && <p className="text-xs text-slate-500">Title is ignored when uploading multiple files.</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label>{uploadMode === 'folder' ? 'Select Folder' : 'Select File(s)'}</Label>
                {uploadMode === 'folder' ? (
                  <Input 
                    type="file" 
                    onChange={e => setUploadFiles(e.target.files ? Array.from(e.target.files) : [])} 
                    required
                    {...({ webkitdirectory: "", directory: "" } as any)} 
                  />
                ) : (
                  <Input 
                    type="file" 
                    onChange={e => setUploadFiles(e.target.files ? Array.from(e.target.files) : [])} 
                    required
                    multiple
                  />
                )}
                {uploadFiles.length > 0 && (
                  <p className="text-sm text-slate-500">{uploadFiles.length} file(s) selected.</p>
                )}
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
              
              {isUploading && uploadProgress.total > 0 && (
                <div className="w-full bg-slate-200 rounded-full h-2.5 mt-4">
                  <div className="bg-sky-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                  <p className="text-xs text-center text-slate-500 mt-2">Uploading {uploadProgress.current} of {uploadProgress.total}...</p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsUploadModalOpen(false)} disabled={isUploading}>Cancel</Button>
                <Button type="submit" disabled={isUploading || uploadFiles.length === 0}>
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
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
          
          {documents.length > 0 && (
            <div className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                id="selectAll"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                checked={documents.length > 0 && selectedDocumentIds.length === documents.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedDocumentIds(documents.map(d => d.id));
                  } else {
                    setSelectedDocumentIds([]);
                  }
                }}
              />
              <label htmlFor="selectAll" className="text-slate-500 cursor-pointer select-none">
                Select All
              </label>
            </div>
          )}
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
                  className={`flex flex-col items-center p-4 rounded-xl border transition-all relative group ${selectedDocumentIds.includes(doc.id) ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer'}`}
                >
                  <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                      checked={selectedDocumentIds.includes(doc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocumentIds([...selectedDocumentIds, doc.id]);
                        } else {
                          setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id));
                        }
                      }}
                    />
                  </div>
                  {/* Selected state persists checkbox visibility */}
                  {selectedDocumentIds.includes(doc.id) && (
                    <div className="absolute top-2 left-2 z-10 flex items-center justify-center">
                      <input 
                        type="checkbox"
                        className="h-4 w-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                        checked={true}
                        onChange={() => setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id))}
                      />
                    </div>
                  )}

                  <div onClick={() => setSelectedDocument(doc)} className="flex flex-col items-center w-full mt-2">
                    {doc.isRestricted && (
                      <div className="absolute top-2 right-2 bg-rose-100 p-1 rounded-full">
                        <Lock className="h-3 w-3 text-rose-600" />
                      </div>
                    )}
                    {getFileIcon(doc.mimeType)}
                    <span className="text-sm font-medium text-slate-700 text-center line-clamp-2 mt-3 mb-1" title={doc.title}>{doc.title}</span>
                    <span className="text-xs text-slate-400">{formatSize(doc.size)}</span>
                  </div>
                  
                  {/* Hover Actions */}
                  <div 
                    className="absolute inset-0 bg-slate-900/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px] pointer-events-none"
                  >
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
                        className={`flex items-center justify-between p-2 rounded-lg group transition-colors ${selectedDocumentIds.includes(doc.id) ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <input 
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                            checked={selectedDocumentIds.includes(doc.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDocumentIds([...selectedDocumentIds, doc.id]);
                              } else {
                                setSelectedDocumentIds(selectedDocumentIds.filter(id => id !== doc.id));
                              }
                            }}
                          />
                          <div onClick={() => setSelectedDocument(doc)} className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer">
                            {getSmallFileIcon(doc.mimeType)}
                            <span className="text-sm font-medium text-slate-700 truncate">{doc.title}</span>
                            {doc.isRestricted && <Lock className="h-3 w-3 text-rose-500 flex-shrink-0" />}
                          </div>
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
              
              <div className="flex flex-wrap items-center gap-2">
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
                <Button 
                  variant="outline"
                  onClick={() => handleDeleteDocuments([selectedDocument.id])}
                  disabled={isDeleting}
                  className="h-10 px-4 py-2 shrink-0 border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  {isDeleting ? '...' : 'Delete'}
                </Button>
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

