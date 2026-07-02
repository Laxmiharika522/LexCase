import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus, ShieldCheck, Trash2, Search, User, Building2,
  Mail, Phone, Briefcase, Calendar, Scale, Trophy, XCircle,
  AlertCircle, CheckCircle2, ChevronRight, TrendingUp, FileText
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EMPTY = { name: "", email: "", phone: "", company: "", address: "", notes: "", confidential: false, assigned_lawyer: "" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  
  // Profile View State
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [cliRes, caseRes, apptRes, invRes, docRes, userRes] = await Promise.all([
        api.get("/clients"),
        api.get("/cases"),
        api.get("/appointments"),
        api.get("/invoices"),
        api.get("/documents"),
        api.get("/users")
      ]);
      setClients(cliRes.data);
      setCases(caseRes.data);
      setAppointments(apptRes.data);
      setInvoices(invRes.data);
      setDocuments(docRes.data);
      setLawyers(userRes.data.filter(u => u.role === "lawyer"));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const submit = async () => {
    try {
      if (!form.name) { toast.error("Name required"); return; }
      const payload = { ...form, email: form.email || null };
      await api.post("/clients", payload);
      toast.success("Client added successfully");
      setOpen(false); setForm(EMPTY); loadAll();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete client ${c.name}? This will not delete their cases.`)) return;
    try { await api.delete(`/clients/${c.id}`); toast.success("Client deleted"); loadAll(); }
    catch (err) { toast.error(formatApiError(err)); }
  };

  const filtered = clients.filter(c => 
    !search || 
    c.name?.toLowerCase().includes(search.toLowerCase()) || 
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-slate-900 to-black p-8 sm:p-12 shadow-2xl border border-zinc-800">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-amber-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-semibold tracking-widest text-amber-300 uppercase">Directory</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Client <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-200">Roster</span>
            </h1>
            <p className="text-zinc-400 mt-3 text-lg font-light max-w-xl">
              Manage client relationships, track case outcomes, and monitor legal proceedings securely.
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-12 px-6 bg-white text-zinc-900 hover:bg-zinc-100 shadow-xl transition-all border-0 font-medium">
                <Plus className="w-5 h-5 mr-2 text-amber-600" />
                Add New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl p-0 border-0 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 p-6 text-white">
                <DialogTitle className="text-xl font-serif">New Client Profile</DialogTitle>
                <DialogDescription className="text-zinc-400 mt-1">Enter the details for the new client.</DialogDescription>
              </div>
              <div className="p-6 space-y-5 bg-white">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name <span className="text-rose-500">*</span></Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" placeholder="e.g. Jane Doe" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl h-11" placeholder="jane@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl h-11" placeholder="(555) 123-4567" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Company <span className="lowercase font-normal">(optional)</span></Label>
                  <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="rounded-xl h-11" placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="rounded-xl h-11" placeholder="123 Legal Way..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl resize-none p-3" rows={3} placeholder="Additional context..." />
                </div>
                
                {user?.role === "admin" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Assign Lawyer <span className="lowercase font-normal">(optional)</span></Label>
                    <Select value={form.assigned_lawyer} onValueChange={(v) => setForm({ ...form, assigned_lawyer: v })}>
                      <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a lawyer" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {lawyers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex items-start gap-4 p-4 bg-rose-50/50 border border-rose-100 rounded-xl mt-4">
                  <Switch checked={form.confidential} onCheckedChange={(v) => setForm({ ...form, confidential: v })} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-rose-900">Mark as Strictly Confidential</div>
                    <div className="text-xs text-rose-700/70 mt-1">Restricts visibility to assigned lawyers and administrators only.</div>
                  </div>
                </div>
              </div>
              <DialogFooter className="p-4 bg-zinc-50 border-t border-zinc-100">
                <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={submit} className="rounded-xl bg-zinc-900 hover:bg-black text-white px-6">Create Client</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif text-zinc-800">Client Profiles <span className="text-zinc-400 font-sans text-sm ml-2">({filtered.length})</span></h2>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-white shadow-sm border-zinc-200"
          />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
          <div className="text-sm font-medium text-zinc-500 uppercase tracking-widest">Loading Directory...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100">
            <User className="w-8 h-8 text-zinc-300" />
          </div>
          <div className="text-xl font-serif text-zinc-800 mb-2">No clients found</div>
          <div className="text-zinc-500 max-w-sm mx-auto">Try adjusting your search or add a new client to the directory.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map(c => {
            // Aggregate Statistics
            const clientCases = cases.filter(cs => cs.client_id === c.id || cs.client_id === c.client_id);
            const clientAppts = appointments.filter(a => a.client_id === c.id || a.client_id === c.client_id);
            
            const totalCases = clientCases.length;
            const casesWon = clientCases.filter(cs => cs.outcome === 'won').length;
            const casesLost = clientCases.filter(cs => cs.outcome === 'lost').length;
            const activeCases = clientCases.filter(cs => cs.status !== 'closed').length;
            
            const totalAppts = clientAppts.length;
            const courtHearings = clientAppts.filter(a => 
              a.status === 'completed' && 
              (a.purpose?.toLowerCase().includes('court') || a.purpose?.toLowerCase().includes('hearing'))
            ).length;

            return (
              <div key={c.id} className="group bg-white rounded-3xl border border-zinc-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                {/* Card Header */}
                <div className="p-6 border-b border-zinc-50 flex items-start justify-between bg-gradient-to-b from-zinc-50/50 to-white">
                  <div className="flex gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
                      <span className="text-xl font-serif font-bold">{c.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-zinc-900">{c.name}</h3>
                      {c.company && (
                        <div className="flex items-center gap-1.5 text-sm text-zinc-500 mt-1">
                          <Building2 className="w-3.5 h-3.5" /> {c.company}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {c.confidential && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                        <ShieldCheck className="w-3 h-3" /> Confidential
                      </span>
                    )}
                    <button onClick={() => remove(c)} className="text-zinc-400 hover:text-rose-600 transition-colors p-1" title="Delete Client">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="px-6 py-4 bg-zinc-50/50 grid grid-cols-2 gap-4 text-sm border-b border-zinc-50">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <span className="truncate">{c.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <span>{c.phone || "No phone"}</span>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  {/* Active Cases */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600/70">
                      <Briefcase className="w-3.5 h-3.5" /> Active
                    </div>
                    <div className="text-2xl font-serif text-zinc-800">{activeCases}</div>
                    <div className="text-xs text-zinc-400">Cases ongoing</div>
                  </div>
                  
                  {/* Won Cases */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600/70">
                      <Trophy className="w-3.5 h-3.5" /> Won
                    </div>
                    <div className="text-2xl font-serif text-zinc-800">{casesWon}</div>
                    <div className="text-xs text-zinc-400">Cases victorious</div>
                  </div>

                  {/* Appointments */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600/70">
                      <Calendar className="w-3.5 h-3.5" /> Appts
                    </div>
                    <div className="text-2xl font-serif text-zinc-800">{totalAppts}</div>
                    <div className="text-xs text-zinc-400">Total meetings</div>
                  </div>

                  {/* Court Hearings */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600/70">
                      <Scale className="w-3.5 h-3.5" /> Court
                    </div>
                    <div className="text-2xl font-serif text-zinc-800">{courtHearings}</div>
                    <div className="text-xs text-zinc-400">Hearings attended</div>
                  </div>
                </div>

                {/* Footer status summary */}
                <div className="px-6 py-3 bg-zinc-900 text-zinc-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-zinc-500" /> {totalCases} Total Cases</span>
                    {casesLost > 0 && <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-rose-500/70" /> {casesLost} Lost</span>}
                  </div>
                  <Button onClick={() => { setSelectedClient(c); setProfileOpen(true); }} variant="link" className="h-auto p-0 text-amber-400 hover:text-amber-300 font-semibold text-xs">
                    View Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
          {selectedClient && (() => {
            const clientAppts = appointments.filter(a => a.client_id === selectedClient.id || a.client_id === selectedClient.client_id);
            const clientInvoices = invoices.filter(i => i.client_id === selectedClient.id || i.client_id === selectedClient.client_id);
            const clientDocs = documents.filter(d => d.uploaded_by === selectedClient.id || d.uploaded_by === selectedClient.client_id);
            
            const totalPaid = clientInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);

            return (
              <>
                <div className="bg-gradient-to-br from-zinc-900 to-black p-8 text-white relative">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-amber-500 rounded-full blur-[80px] opacity-20"></div>
                  <div className="flex gap-5 items-center relative z-10">
                    <div className="w-20 h-20 rounded-full bg-zinc-800 border border-zinc-700 text-amber-500 flex items-center justify-center text-3xl font-serif">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-serif">{selectedClient.name}</DialogTitle>
                      <DialogDescription className="text-zinc-400 flex items-center gap-3 mt-1.5 text-sm">
                        <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {selectedClient.email || "No email"}</span>
                        <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {selectedClient.phone || "No phone"}</span>
                      </DialogDescription>
                    </div>
                  </div>
                </div>
                
                <div className="p-8 space-y-8 bg-zinc-50">
                  {/* Financial & General Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2"><TrendingUp className="w-5 h-5" /></div>
                      <div className="text-2xl font-serif text-zinc-800">${totalPaid.toFixed(2)}</div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-1">Total Paid</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Calendar className="w-5 h-5" /></div>
                      <div className="text-2xl font-serif text-zinc-800">{clientAppts.length}</div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-1">Meetings</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2"><FileText className="w-5 h-5" /></div>
                      <div className="text-2xl font-serif text-zinc-800">{clientDocs.length}</div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-1">Documents</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-2"><Building2 className="w-5 h-5" /></div>
                      <div className="text-sm font-medium text-zinc-800 mt-2 truncate max-w-full px-2">{selectedClient.company || "N/A"}</div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mt-1">Company</div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Meeting History */}
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-400" /> Meeting History
                      </h4>
                      {clientAppts.length === 0 ? (
                        <div className="text-sm text-zinc-500 italic bg-white p-4 rounded-xl border border-zinc-100">No meetings scheduled.</div>
                      ) : (
                        <div className="space-y-3">
                          {clientAppts.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5).map(a => (
                            <div key={a.id} className="bg-white p-4 rounded-xl border border-zinc-100 shadow-sm flex flex-col gap-2">
                              <div className="flex justify-between items-start">
                                <span className="font-semibold text-sm text-zinc-900">{a.description}</span>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                                  a.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                  a.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                }`}>{a.status}</span>
                              </div>
                              <div className="text-xs text-zinc-500 flex items-center gap-3">
                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(a.date).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1 capitalize"><User className="w-3.5 h-3.5" /> {a.meeting_type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Documents Uploaded */}
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-800 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-zinc-400" /> Uploaded Documents
                      </h4>
                      {clientDocs.length === 0 ? (
                        <div className="text-sm text-zinc-500 italic bg-white p-4 rounded-xl border border-zinc-100">No documents uploaded.</div>
                      ) : (
                        <div className="space-y-3">
                          {clientDocs.map(d => (
                            <div key={d.id} className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm flex items-center gap-3">
                              <div className="w-10 h-10 bg-rose-50 text-rose-600 flex items-center justify-center rounded-lg">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-zinc-900 truncate">{d.original_filename}</div>
                                <div className="text-xs text-zinc-500">{(d.size / 1024).toFixed(1)} KB</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
