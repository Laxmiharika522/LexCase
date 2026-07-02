import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Briefcase, Scale, MoreHorizontal, CheckCircle2, AlertCircle, Trash2, Edit2, User, FileText, ChevronRight, Bookmark } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const STATUS = [
  { v: "intake", label: "Intake", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { v: "open", label: "Open", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { v: "on_hold", label: "On Hold", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { v: "closed", label: "Closed", color: "bg-zinc-100 text-zinc-700 border-zinc-200" },
];

const OUTCOMES = [
  { v: "won", label: "Won" },
  { v: "lost", label: "Lost" },
  { v: "settled", label: "Settled" },
  { v: "dismissed", label: "Dismissed" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const PRACTICE = ["Litigation", "Corporate", "Family", "Real Estate", "Criminal", "IP", "Immigration", "Employment"];

const PRIORITY_COLOR = {
  urgent: "bg-rose-500 text-white shadow-sm",
  high: "bg-orange-100 text-orange-800 border border-orange-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  low: "bg-zinc-50 text-zinc-600 border border-zinc-200",
};

export default function Cases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Modal states
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const DEFAULT_FORM = { title: "", client_id: "", practice_area: "Litigation", status: "intake", outcome: "none", priority: "medium", description: "", assigned_to: "unassigned" };
  const [form, setForm] = useState(DEFAULT_FORM);

  const load = async () => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter !== "all") params.status = statusFilter;
    try {
      const { data } = await api.get("/cases", { params });
      setCases(data);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  useEffect(() => { load(); }, [search, statusFilter]);
  
  useEffect(() => {
    api.get("/clients").then((r) => setClients(r.data)).catch(console.error);
    api.get("/users").then((r) => setUsers(r.data)).catch(console.error);
  }, []);

  const openNew = () => {
    setEditMode(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setOpen(true);
  };

  const openEdit = (c) => {
    setEditMode(true);
    setEditingId(c.id);
    setForm({
      title: c.title,
      client_id: c.client_id,
      practice_area: c.practice_area || "Litigation",
      status: c.status || "intake",
      outcome: c.outcome || "none",
      priority: c.priority || "medium",
      description: c.description || "",
      assigned_to: c.assigned_to || "unassigned",
    });
    setOpen(true);
  };

  const submit = async () => {
    try {
      if (!form.title || !form.client_id) { toast.error("Title and client are required"); return; }
      
      const payload = { 
        ...form, 
        assigned_to: form.assigned_to === "unassigned" || !form.assigned_to ? null : form.assigned_to,
        outcome: form.outcome === "none" ? null : form.outcome
      };

      if (editMode && editingId) {
        await api.put(`/cases/${editingId}`, payload);
        toast.success("Case updated successfully");
      } else {
        await api.post("/cases", payload);
        toast.success("Case created successfully");
      }
      
      setOpen(false);
      load();
    } catch (err) { 
      toast.error(formatApiError(err)); 
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete case "${c.title}"? This cannot be undone.`)) return;
    try { 
      await api.delete(`/cases/${c.id}`); 
      toast.success("Case deleted"); 
      load(); 
    } catch (err) { 
      toast.error(formatApiError(err)); 
    }
  };

  const getClientName = (id) => clients.find(c => c.id === id)?.name || "—";
  const getLawyerName = (id) => users.find(u => u.id === id)?.name || "Unassigned";

  // Quick stats
  const activeCount = cases.filter(c => c.status === "open").length;
  const intakeCount = cases.filter(c => c.status === "intake").length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-8 sm:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Matters</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Case <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-rose-200">Management</span>
            </h1>
            <p className="text-indigo-200/80 mt-3 text-lg font-light max-w-xl">
              All active and archived legal matters across the firm.
            </p>
          </div>
          
          <Button onClick={openNew} className="rounded-xl h-12 px-6 bg-white text-indigo-950 hover:bg-indigo-50 shadow-xl transition-all border-0 font-medium whitespace-nowrap" data-testid="new-case-btn">
            <Plus className="w-5 h-5 mr-2 text-indigo-600" /> New Case
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl" data-testid="new-case-dialog">
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-6 text-white">
                <DialogTitle className="text-xl font-serif">{editMode ? "Edit Case Details" : "Open New Case"}</DialogTitle>
                <DialogDescription className="text-indigo-200 mt-1">
                  {editMode ? "Modify the details of this legal matter." : "Intake a new legal matter for the firm."}
                </DialogDescription>
              </div>
              <div className="p-6 space-y-5 bg-white">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Case Title <span className="text-rose-500">*</span></Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl h-11" placeholder="e.g. Acme Corp Merger" data-testid="case-title-input" />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client <span className="text-rose-500">*</span></Label>
                  <Select value={form.client_id || undefined} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger className="rounded-xl h-11" data-testid="case-client-select"><SelectValue placeholder="Choose client" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {clients.length === 0 && <div className="px-3 py-2 text-xs text-slate-500">Create a client first</div>}
                      {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Practice Area</Label>
                    <Select value={form.practice_area} onValueChange={(v) => setForm({ ...form, practice_area: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">{PRACTICE.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outcome <span className="lowercase font-normal">(if closed)</span></Label>
                    <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none">None / N/A</SelectItem>
                        {OUTCOMES.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Lawyer</Label>
                  <Select value={form.assigned_to || undefined} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] font-medium text-slate-500 uppercase mt-1">Assigning a lawyer notifies the client and opens messaging.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl resize-none p-3" rows={4} placeholder="Initial case facts and notes..." />
                </div>
              </div>
              <DialogFooter className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl hover:bg-slate-200">Cancel</Button>
                <Button onClick={submit} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md transition-all" data-testid="create-case-submit-btn">
                  {editMode ? "Save Changes" : "Create Case"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search by title or number…" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10 h-11 rounded-xl bg-white shadow-sm border-slate-200 focus:ring-indigo-500" 
            data-testid="cases-search-input" 
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl bg-white shadow-sm border-slate-200 focus:ring-indigo-500" data-testid="cases-status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {cases.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Briefcase className="w-8 h-8 text-slate-300" />
          </div>
          <div className="text-xl font-serif text-slate-800 mb-2">No cases found</div>
          <div className="text-slate-500 max-w-sm mx-auto">Create a new case to get started or adjust your search filters.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {cases.map((c) => {
            const statusCfg = STATUS.find(s => s.v === c.status) || STATUS[0];
            const isUrgent = c.priority === "urgent";
            return (
              <div key={c.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 shadow-xl">
                        <DropdownMenuItem onClick={() => openEdit(c)} className="cursor-pointer py-2 focus:bg-slate-50">
                          <Edit2 className="mr-2 h-4 w-4 text-blue-600" /> 
                          <span className="font-medium">Edit Case</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => remove(c)} className="cursor-pointer py-2 focus:bg-rose-50 text-rose-600 focus:text-rose-700">
                          <Trash2 className="mr-2 h-4 w-4" /> 
                          <span className="font-medium">Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors mb-2 line-clamp-2">
                    {c.title}
                  </h3>
                  
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{getClientName(c.client_id)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span className="truncate">{c.practice_area || "General Practice"}</span>
                    </div>
                    {c.case_number && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{c.case_number}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50/50 flex flex-wrap items-center gap-3 border-b border-slate-50 text-sm">
                  <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.medium}`}>
                    {isUrgent && <AlertCircle className="w-3.5 h-3.5" />}
                    {c.priority} Priority
                  </div>
                  {c.outcome && c.status === "closed" && (
                    <div className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 flex items-center gap-1.5">
                      <Bookmark className="w-3.5 h-3.5" /> {c.outcome}
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 flex items-center justify-between text-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Assigned To</span>
                    <span className="font-medium text-slate-800 flex items-center gap-1.5">
                      {c.assigned_to ? (
                        <><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {getLawyerName(c.assigned_to)}</>
                      ) : (
                        <><div className="w-2 h-2 rounded-full bg-amber-500"></div> Unassigned</>
                      )}
                    </span>
                  </div>
                  <Button onClick={() => navigate(`/cases/${c.id}`)} variant="ghost" className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium text-xs rounded-lg">
                    View Details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
