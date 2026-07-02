import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Upload, Sparkles, ArrowLeft, Download, Trash2, 
  Briefcase, Calendar, FileText, CheckCircle2, AlertCircle, 
  User, Clock, Scale, AlignLeft
} from "lucide-react";

const STATUS = [
  { v: "intake", label: "Intake", color: "bg-purple-100 text-purple-700" },
  { v: "open", label: "Open", color: "bg-blue-100 text-blue-700" },
  { v: "on_hold", label: "On Hold", color: "bg-amber-100 text-amber-700" },
  { v: "closed", label: "Closed", color: "bg-zinc-100 text-zinc-700" },
];

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [docs, setDocs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", due_date: "", priority: "medium" });
  const [researchQuery, setResearchQuery] = useState("");
  const [researchResults, setResearchResults] = useState([]);
  const [researching, setResearching] = useState(false);
  const [history, setHistory] = useState(null);

  const loadAll = async () => {
    try {
      const [caseRes, taskRes, docRes, apptRes] = await Promise.all([
        api.get(`/cases/${id}`),
        api.get("/tasks", { params: { case_id: id } }),
        api.get("/documents", { params: { case_id: id } }),
        api.get("/appointments", { params: { case_id: id } })
      ]);
      setC(caseRes.data);
      setTasks(taskRes.data);
      setDocs(docRes.data);
      setAppointments(apptRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
      navigate("/cases");
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  const loadHistory = async () => {
    try {
      const res = await api.get(`/cases/${id}/history`);
      setHistory(res.data);
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const searchResearch = async () => {
    if (!researchQuery.trim()) return;
    setResearching(true);
    try {
      const res = await api.get("/research/search", { params: { q: researchQuery } });
      setResearchResults(res.data.results || []);
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setResearching(false); }
  };

  const updateStatus = async (v) => {
    await api.put(`/cases/${id}`, { status: v });
    toast.success("Status updated");
    loadAll();
  };

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("case_id", id);
    try {
      await api.post("/documents/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded");
      loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
    e.target.value = "";
  };



  const createTask = async () => {
    try {
      if (!taskForm.title || !taskForm.due_date) { toast.error("Title & date required"); return; }
      await api.post("/tasks", { ...taskForm, case_id: id });
      toast.success("Deadline added");
      setShowTask(false);
      setTaskForm({ title: "", due_date: "", priority: "medium" });
      loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const toggleTask = async (t) => {
    const next = t.status === "done" ? "pending" : "done";
    await api.put(`/tasks/${t.id}`, { status: next });
    loadAll();
  };

  const downloadDoc = async (d) => {
    const res = await api.get(`/documents/${d.id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url; a.download = d.original_filename; a.click();
    URL.revokeObjectURL(url);
    if (user?.role === "admin" || user?.role === "lawyer") {
      try {
        await api.post(`/documents/${d.id}/view`);
        loadAll();
      } catch (e) {}
    }
  };

  const removeDoc = async (d) => {
    if (!window.confirm(`Delete "${d.original_filename}"?`)) return;
    await api.delete(`/documents/${d.id}`);
    toast.success("Deleted");
    loadAll();
  };

  if (!c) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Case Details...</div>
    </div>
  );

  const statusCfg = STATUS.find(s => s.v === c.status) || STATUS[0];
  const completedHearings = appointments.filter(a => a.status === 'completed').length;
  const isUrgent = c.priority === 'urgent';
  const createdDate = c.created_at ? new Date(c.created_at).toLocaleDateString() : "Unknown";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <div>
        <Link to="/cases" className="text-xs font-bold uppercase tracking-wider text-indigo-500 hover:text-indigo-700 flex items-center gap-1.5 transition-colors mb-6" data-testid="back-to-cases">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
        
        {/* Premium Header */}
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row p-8 sm:p-10 gap-8">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-10"></div>
          
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
              {c.case_number && (
                <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
                  {c.case_number}
                </span>
              )}
              {isUrgent && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5" /> Urgent
                </span>
              )}
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-none text-slate-900 mb-6">{c.title}</h1>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1"><User className="w-3 h-3" /> Client</div>
                <div className="font-medium text-slate-800">{c.client?.name || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1"><Briefcase className="w-3 h-3" /> Practice Area</div>
                <div className="font-medium text-slate-800">{c.practice_area || "—"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1"><Calendar className="w-3 h-3" /> Created</div>
                <div className="font-medium text-slate-800">{createdDate}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1"><Scale className="w-3 h-3" /> Hearings</div>
                <div className="font-medium text-slate-800">{completedHearings} <span className="text-slate-400 font-normal">happened</span></div>
              </div>
            </div>
          </div>
          
          <div className="md:w-64 shrink-0 flex flex-col gap-4 relative z-10 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 justify-center">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Change Status</Label>
              <Select value={c.status} onValueChange={updateStatus}>
                <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-slate-200" data-testid="case-status-select"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-serif text-xl">
              <AlignLeft className="w-5 h-5 text-indigo-500" /> Summary
            </div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {c.description || <span className="italic text-slate-400">No summary provided for this case.</span>}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-3xl shadow-xl p-6 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white rounded-full blur-[60px] opacity-10"></div>
             <h3 className="font-serif text-xl mb-4 relative z-10">Case Statistics</h3>
             <div className="space-y-4 relative z-10">
               <div className="flex justify-between items-center pb-3 border-b border-white/10">
                 <span className="text-indigo-200 text-sm">Documents</span>
                 <span className="font-bold font-mono bg-white/20 px-2 py-0.5 rounded text-xs">{docs.length}</span>
               </div>
               <div className="flex justify-between items-center pb-3 border-b border-white/10">
                 <span className="text-indigo-200 text-sm">Deadlines</span>
                 <span className="font-bold font-mono bg-white/20 px-2 py-0.5 rounded text-xs">{tasks.length}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-indigo-200 text-sm">Total Appts</span>
                 <span className="font-bold font-mono bg-white/20 px-2 py-0.5 rounded text-xs">{appointments.length}</span>
               </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="bg-white border border-slate-100 shadow-sm p-1.5 rounded-2xl w-full flex mb-6">
              <TabsTrigger value="documents" className="flex-1 rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2.5 text-sm font-semibold transition-all">Documents</TabsTrigger>
              <TabsTrigger value="deadlines" className="flex-1 rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2.5 text-sm font-semibold transition-all">Tasks & Deadlines</TabsTrigger>
              <TabsTrigger value="research" className="flex-1 rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2.5 text-sm font-semibold transition-all">Legal Research</TabsTrigger>
              <TabsTrigger value="history" onClick={loadHistory} className="flex-1 rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 py-2.5 text-sm font-semibold transition-all">Case History</TabsTrigger>
            </TabsList>

            {/* Documents */}
            <TabsContent value="documents" className="space-y-6">
              <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-slate-50/50">
                    <div>
                      <h2 className="font-serif text-2xl text-slate-800">Case Files</h2>
                    </div>
                    {user?.role !== "admin" && (
                      <label className="cursor-pointer">
                        <input type="file" className="hidden" onChange={upload} data-testid="upload-document-input" />
                        <span className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all shadow-md">
                          <Upload className="w-4 h-4" /> Upload
                        </span>
                      </label>
                    )}
                  </div>
                  <div className="flex-1">
                    {docs.length === 0 && (
                      <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><FileText className="w-8 h-8 text-slate-300" /></div>
                        <div className="text-sm text-slate-500 font-medium">No documents yet.</div>
                      </div>
                    )}
                    {docs.map((d) => (
                      <div key={d.id} className="flex items-center justify-between px-6 py-4 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors" data-testid={`doc-row-${d.id}`}>
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><FileText className="w-5 h-5" /></div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2">
                              {d.original_filename}
                              {d.viewed_by_admin && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Viewed</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-1">{(d.size / 1024).toFixed(1)} KB · {(d.created_at || "").slice(0, 10)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 pl-4">
                          <button onClick={(e) => { e.stopPropagation(); downloadDoc(d); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors" data-testid={`download-${d.id}`}><Download className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); removeDoc(d); }} className="p-2 text-slate-400 hover:text-rose-600 transition-colors" data-testid={`delete-${d.id}`}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Deadlines */}
            <TabsContent value="deadlines" className="pt-2">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50 bg-slate-50/50">
                  <div>
                    <h2 className="font-serif text-2xl text-slate-800">Timeline & Tasks</h2>
                  </div>
                  <Dialog open={showTask} onOpenChange={setShowTask}>
                    <DialogTrigger asChild>
                      <Button className="rounded-xl h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md" data-testid="add-deadline-btn">
                        Add Deadline
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-3xl p-6 sm:max-w-[425px]">
                      <DialogHeader><DialogTitle className="font-serif text-2xl">New Deadline</DialogTitle></DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Title</Label>
                          <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="rounded-xl mt-1.5 h-11" data-testid="task-title-input" />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</Label>
                          <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} className="rounded-xl mt-1.5 h-11" data-testid="task-due-input" />
                        </div>
                        <div>
                          <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</Label>
                          <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                            <SelectTrigger className="rounded-xl mt-1.5 h-11"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-xl">{["low","medium","high","urgent"].map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter className="mt-6"><Button onClick={createTask} className="rounded-xl w-full h-11 bg-indigo-600 hover:bg-indigo-700" data-testid="create-task-submit-btn">Add Task</Button></DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div>
                  {tasks.length === 0 && (
                    <div className="p-12 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Clock className="w-8 h-8 text-slate-300" /></div>
                      <div className="text-sm text-slate-500 font-medium">No upcoming deadlines or tasks.</div>
                    </div>
                  )}
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0 border-slate-100 hover:bg-slate-50 transition-colors group">
                      <input type="checkbox" checked={t.status === "done"} onChange={() => toggleTask(t)} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" data-testid={`task-check-${t.id}`} />
                      <div className={`flex-1 min-w-0 ${t.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                        <div className="text-sm font-semibold truncate">{t.title}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                          t.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                          t.priority === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>{t.priority}</span>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{(t.due_date || "").slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Legal Research */}
            <TabsContent value="research" className="pt-2">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h2 className="font-serif text-2xl text-slate-800">Related Case Law</h2>
                <p className="text-sm text-slate-500">Search CourtListener for relevant precedents related to this case.</p>
                <div className="flex gap-2">
                  <Input
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    placeholder={c.practice_area ? `${c.practice_area} ${c.title}` : c.title}
                    className="rounded-xl h-11"
                    onKeyDown={(e) => e.key === "Enter" && searchResearch()}
                  />
                  <Button onClick={searchResearch} disabled={researching} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shrink-0">
                    {researching ? "Searching…" : "Search"}
                  </Button>
                </div>
                {researchResults.length === 0 && !researching && (
                  <p className="text-sm text-slate-400 italic">Enter a query to search legal databases.</p>
                )}
                <div className="space-y-3">
                  {researchResults.map((r, i) => (
                    <div key={i} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50">
                      <div className="font-semibold text-slate-800">{r.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{r.court} · {r.date_filed?.slice?.(0, 10) || r.date_filed}</div>
                      {r.snippet && <p className="text-sm text-slate-600 mt-2">{r.snippet}</p>}
                      {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">View on CourtListener →</a>}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Case History */}
            <TabsContent value="history" className="pt-2">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <h2 className="font-serif text-2xl text-slate-800">Case History</h2>
                {!history && <p className="text-sm text-slate-400">Loading history…</p>}
                {history && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Audit Trail</h3>
                      {history.audit_logs?.length === 0 && <p className="text-sm text-slate-400 italic">No audit entries yet.</p>}
                      {history.audit_logs?.map((log) => (
                        <div key={log.id} className="flex gap-3 py-2 border-b border-slate-50 text-sm">
                          <span className="text-slate-400 font-mono text-xs shrink-0">{(log.created_at || "").slice(0, 16)}</span>
                          <span className="font-medium text-slate-700">{log.action}</span>
                          <span className="text-slate-500">{log.entity_type}</span>
                          {log.details?.title && <span className="text-slate-600">— {log.details.title}</span>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Messages ({history.messages?.length || 0})</h3>
                      {history.messages?.slice(0, 5).map((m) => (
                        <div key={m.id} className="text-sm text-slate-600 py-1 border-b border-slate-50 truncate">{m.content}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
