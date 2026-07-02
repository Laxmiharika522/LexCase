import React, { useEffect, useRef, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText, MoreHorizontal, Edit2, ShieldCheck, User, FolderArchive, Clock, Eye } from "lucide-react";

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", original_filename: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/documents");
      setDocs(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    try {
      await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded successfully");
      load();
    } catch (err) { toast.error(formatApiError(err)); }
    e.target.value = "";
  };

  const download = async (d) => {
    try {
      const res = await api.get(`/documents/${d.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = d.original_filename; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download document");
    }
  };

  const viewDocument = async (d) => {
    try {
      if (isAdminOrLawyer) {
        // Mark as viewed in backend
        await api.post(`/documents/${d.id}/view`);
        // Update local state to reflect the change
        setDocs(docs.map(doc => doc.id === d.id ? { ...doc, viewed_by_admin: true } : doc));
      }
      
      // Open document in a new tab for viewing
      const res = await api.get(`/documents/${d.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
      // Revoke the object URL after a delay to ensure the new tab had time to load it
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error("Failed to view document");
    }
  };

  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.original_filename}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/documents/${d.id}`); 
      toast.success("Document deleted"); 
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const openEdit = (d) => {
    setEditForm({ id: d.id, original_filename: d.original_filename });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put(`/documents/${editForm.id}`, { original_filename: editForm.original_filename });
      toast.success("Document renamed successfully");
      setEditModalOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group documents by uploader
  const groupedDocs = docs.reduce((acc, doc) => {
    const key = doc.uploaded_by_name || "Unknown User";
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const isAdminOrLawyer = user?.role === "admin" || user?.role === "lawyer";
  const canUpload = user?.role !== "admin";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-semibold tracking-widest text-emerald-300 uppercase">Secure Vault</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Case <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-blue-200">Documents</span>
            </h1>
            <p className="text-slate-300 mt-3 text-lg font-light max-w-xl">
              Encrypted storage for case files, contracts, evidence, and client uploads.
            </p>
          </div>
          
          {canUpload && (
            <>
              <input ref={fileRef} type="file" className="hidden" onChange={upload} data-testid="upload-document-input" />
              <Button onClick={() => fileRef.current?.click()} className="rounded-xl h-12 px-6 bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all border-0 font-medium">
                <Upload className="w-5 h-5 mr-2 text-emerald-600" />
                Upload Document
              </Button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Vault...</div>
        </div>
      ) : docs.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <FolderArchive className="w-8 h-8 text-slate-400" />
            </div>
            <div className="text-lg font-serif text-slate-900 mb-1">The vault is empty</div>
            <div className="text-sm text-slate-500">No documents have been uploaded yet.</div>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedDocs).map(([uploaderName, userDocs]) => (
            <Card key={uploaderName} className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
              {isAdminOrLawyer && (
                <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 pt-6 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-serif text-slate-900">
                        {uploaderName === user?.name ? "Uploaded by You" : `Uploaded by ${uploaderName}`}
                      </CardTitle>
                      <CardDescription className="text-slate-500 flex items-center gap-2">
                        <FolderArchive className="w-3 h-3" /> {userDocs.length} document(s)
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              )}
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 bg-slate-50/50 border-b border-slate-100 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Document Name</th>
                      <th className="px-6 py-4 font-semibold">Size</th>
                      <th className="px-6 py-4 font-semibold">Uploaded</th>
                      <th className="px-6 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userDocs.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 truncate max-w-[200px] sm:max-w-xs lg:max-w-md" title={d.original_filename}>
                                {d.original_filename}
                              </span>
                              {!isAdminOrLawyer && d.viewed_by_admin && (
                                <span className="text-[10px] uppercase tracking-wider font-bold text-teal-600 mt-0.5">
                                  ✓ Viewed by Legal Team
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-mono text-xs">
                          {(d.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(d.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 transition-colors">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 shadow-xl">
                              <DropdownMenuItem onClick={() => viewDocument(d)} className="cursor-pointer py-2 focus:bg-slate-50">
                                <Eye className="mr-2 h-4 w-4 text-blue-600" /> 
                                <span className="font-medium text-slate-700">View</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => download(d)} className="cursor-pointer py-2 focus:bg-slate-50">
                                <Download className="mr-2 h-4 w-4 text-emerald-600" /> 
                                <span className="font-medium text-slate-700">Download</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(d)} className="cursor-pointer py-2 focus:bg-slate-50">
                                <Edit2 className="mr-2 h-4 w-4 text-blue-600" /> 
                                <span className="font-medium text-slate-700">Rename</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100" />
                              <DropdownMenuItem onClick={() => remove(d)} className="cursor-pointer py-2 focus:bg-rose-50 text-rose-600 focus:text-rose-700">
                                <Trash2 className="mr-2 h-4 w-4" /> 
                                <span className="font-medium">Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rename Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <DialogTitle className="text-xl font-serif">Rename Document</DialogTitle>
            <DialogDescription className="text-slate-300 mt-1">
              Update the filename of your document.
            </DialogDescription>
          </div>
          <form onSubmit={handleEditSubmit} className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <Label htmlFor="filename" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">File Name</Label>
              <Input
                id="filename"
                value={editForm.original_filename}
                onChange={(e) => setEditForm({ ...editForm, original_filename: e.target.value })}
                required
                className="rounded-lg h-11 border-slate-200 focus:ring-emerald-500"
              />
            </div>
            <DialogFooter className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)} className="rounded-lg hover:bg-slate-100">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-6 shadow-md transition-all">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
