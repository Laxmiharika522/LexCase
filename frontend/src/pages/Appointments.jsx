import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/apiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar, Clock, Video, Phone, Building2, CalendarCheck,
  CalendarX, Plus, Search, Eye, RefreshCw, X, Check,
  ExternalLink, User, Briefcase, Bell, AlertCircle, Edit,
  CheckCircle2, AlarmClock
} from "lucide-react";

const STATUS_CONFIG = {
  pending:   { label: "Pending",   cls: "bg-amber-500/10 text-amber-700 border-amber-200",  icon: AlarmClock },
  scheduled: { label: "Confirmed", cls: "bg-emerald-500/10 text-emerald-700 border-emerald-200",    icon: CalendarCheck },
  completed: { label: "Completed", cls: "bg-blue-500/10 text-blue-700 border-blue-200",  icon: CheckCircle2 },
  cancelled: { label: "Cancelled", cls: "bg-rose-500/10 text-rose-700 border-rose-200",      icon: CalendarX },
  missed:    { label: "Missed",    cls: "bg-zinc-500/10 text-zinc-700 border-zinc-200",     icon: AlertCircle },
};

const MEETING_ICONS = { video: Video, office: Building2, phone: Phone };
const MEETING_LABELS = { video: "Video Call", office: "In-Office", phone: "Phone Call" };

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function MeetingTypeBadge({ type }) {
  const Icon = MEETING_ICONS[type] || Building2;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
      <Icon className="w-3.5 h-3.5" />
      {MEETING_LABELS[type] || type}
    </span>
  );
}

export default function Appointments() {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const isAdminOrLawyer = user?.role === "admin" || user?.role === "lawyer";

  const [appointments, setAppointments] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [clients, setClients] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [search, setSearch] = useState("");

  // Modals
  const [requestOpen, setRequestOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request form
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    case_id: "", lawyer_id: "", client_id: "", description: "", purpose: "",
    date: "", time: "10:00", meeting_type: "office", notes: "", duration: "60", is_first: false
  });
  
  const [rescheduleForm, setRescheduleForm] = useState({ date: "", time: "10:00" });
  
  // Edit form for admin/lawyer
  const [editForm, setEditForm] = useState({ lawyer_id: "", status: "", notes: "" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [apptRes, usrRes, caseRes] = await Promise.all([
        api.get("/appointments"),
        api.get("/users"),
        api.get("/cases"),
      ]);
      setAppointments(apptRes.data.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setLawyers(usrRes.data.filter(u => u.role === "lawyer" || u.role === "admin"));
      setClients(usrRes.data.filter(u => u.role === "client"));
      setCases(caseRes.data);
      
      // Auto-select case if there's exactly 1
      if (caseRes.data.length === 1) {
        setForm(f => ({ ...f, case_id: caseRes.data[0].id }));
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const filtered = appointments.filter(a => {
    const matchSearch = !search ||
      a.description?.toLowerCase().includes(search.toLowerCase()) ||
      a.purpose?.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    const apptDate = new Date(a.date);
    switch (activeTab) {
      case "upcoming":  return (a.status === "scheduled" || a.status === "pending") && apptDate >= now;
      case "pending":   return a.status === "pending";
      case "completed": return a.status === "completed";
      case "cancelled": return a.status === "cancelled";
      case "missed":    return a.status === "missed" || (a.status !== "completed" && a.status !== "cancelled" && a.status !== "pending" && apptDate < now);
      default:          return true;
    }
  });

  const stats = {
    upcoming:  appointments.filter(a => (a.status === "scheduled" || a.status === "pending") && new Date(a.date) >= now).length,
    pending:   appointments.filter(a => a.status === "pending").length,
    completed: appointments.filter(a => a.status === "completed").length,
    cancelled: appointments.filter(a => a.status === "cancelled").length,
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        client_id: isClient ? (user.client_id || user.id) : "",
        case_id: form.case_id === "none" || !form.case_id ? undefined : form.case_id,
        lawyer_id: user?.role === "lawyer" ? user.id : (form.lawyer_id || undefined),
        date: `${form.date}T${form.time}:00`,
        duration: parseInt(form.duration) || 60,
        description: form.description,
        purpose: form.purpose,
        meeting_type: form.meeting_type,
        notes: form.notes || undefined,
        status: "pending",
      };
      if (!payload.client_id && !isClient) payload.client_id = form.client_id || "unknown";
      const { data } = await api.post("/appointments", payload);
      setAppointments(prev => [...prev, data].sort((a, b) => new Date(a.date) - new Date(b.date)));
      toast.success("Appointment request submitted!");
      setRequestOpen(false);
      setForm({ case_id: cases.length === 1 ? cases[0].id : "", lawyer_id: "", client_id: "", description: "", purpose: "", date: "", time: "10:00", meeting_type: "office", notes: "", duration: "60", is_first: false });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (apptId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await api.delete(`/appointments/${apptId}`);
      setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: "cancelled" } : a));
      toast.success("Appointment cancelled.");
      if (detailOpen) setDetailOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newDate = `${rescheduleForm.date}T${rescheduleForm.time}:00`;
      const { data } = await api.put(`/appointments/${selectedAppt.id}`, { date: newDate, status: "pending" });
      setAppointments(prev => prev.map(a => a.id === selectedAppt.id ? data : a));
      toast.success("Rescheduled successfully! Awaiting confirmation.");
      setRescheduleOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        lawyer_id: editForm.lawyer_id === "none" ? null : editForm.lawyer_id,
        status: editForm.status,
        notes: editForm.notes
      };
      const { data } = await api.put(`/appointments/${selectedAppt.id}`, payload);
      setAppointments(prev => prev.map(a => a.id === selectedAppt.id ? data : a));
      toast.success("Appointment updated and confirmed!");
      setEditOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDetail = (appt) => { setSelectedAppt(appt); setDetailOpen(true); };
  
  const openReschedule = (appt) => {
    setSelectedAppt(appt);
    const d = new Date(appt.date);
    setRescheduleForm({ date: d.toISOString().split("T")[0], time: d.toTimeString().slice(0,5) });
    setRescheduleOpen(true);
  };

  const openEdit = (appt) => {
    setSelectedAppt(appt);
    setEditForm({ 
      lawyer_id: appt.lawyer_id || "none", 
      status: appt.status,
      notes: appt.notes || ""
    });
    setEditOpen(true);
  };

  const getLawyerName = (id) => lawyers.find(l => l.id === id)?.name || "—";
  const getCaseName = (id) => cases.find(c => c.id === id)?.title || "—";

  const TABS = [
    { key: "upcoming",  label: "Upcoming",  count: stats.upcoming },
    { key: "pending",   label: "Pending",   count: stats.pending },
    { key: "completed", label: "Completed", count: stats.completed },
    { key: "cancelled", label: "Cancelled", count: stats.cancelled },
    { key: "missed",    label: "Missed",    count: null },
  ];

  const myLawyerIds = new Set(cases.map(c => c.assigned_to).filter(Boolean));
  const availableLawyers = lawyers.filter(l => {
    if (l.role === "admin") return true;
    if (isClient) {
      if (form.is_first) return false; 
      return myLawyerIds.has(l.id); 
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-8 sm:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-40"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-fuchsia-500 rounded-full blur-[100px] opacity-30"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CalendarCheck className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Scheduling</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Manage <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-fuchsia-200">Appointments</span>
            </h1>
            <p className="text-indigo-200/80 mt-3 text-lg font-light max-w-xl">
              Organize consultations, hearings, and meetings securely.
            </p>
          </div>
          
          <Button onClick={() => setRequestOpen(true)} className="rounded-xl h-12 px-6 bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all border-0 font-medium whitespace-nowrap">
            <Plus className="w-5 h-5 mr-2 text-indigo-600" />
            Request Appointment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Upcoming",  value: stats.upcoming,  color: "text-blue-600",  bg: "bg-blue-50/50", border: "border-blue-100", Icon: Calendar },
          { label: "Pending",   value: stats.pending,   color: "text-amber-600", bg: "bg-amber-50/50", border: "border-amber-100", Icon: AlarmClock },
          { label: "Completed", value: stats.completed, color: "text-emerald-600", bg: "bg-emerald-50/50", border: "border-emerald-100", Icon: CheckCircle2 },
          { label: "Cancelled", value: stats.cancelled, color: "text-rose-500",   bg: "bg-rose-50/50", border: "border-rose-100",  Icon: CalendarX },
        ].map(({ label, value, color, bg, border, Icon }) => (
          <Card key={label} className={`rounded-2xl border ${border} ${bg} cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1`}
            onClick={() => setActiveTab(label.toLowerCase())}>
            <CardContent className="pt-6">
              <div className="flex flex-col items-start gap-4">
                <div className={`w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className={`text-3xl font-serif tracking-tight ${color}`}>{value}</div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">{label}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex bg-slate-100/50 p-1 rounded-xl overflow-hidden border border-slate-200">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-all rounded-lg flex items-center gap-2 ${
                activeTab === tab.key
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-[10px] rounded-full px-2 py-0.5 font-bold ${activeTab === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search appointments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11 w-full sm:w-72 rounded-xl text-sm border-slate-200 bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Appointment List */}
      <div className="space-y-4">
        {loading ? (
          <div className="min-h-[30vh] flex flex-col items-center justify-center">
             <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
             <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Schedule...</div>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border border-slate-100 shadow-sm bg-white">
            <CardContent className="py-20 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Calendar className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-serif text-xl text-slate-800">No appointments found</p>
              <p className="text-slate-500 mt-2">
                {activeTab === "upcoming" ? "You have no upcoming appointments." : `There are no ${activeTab} appointments in the system.`}
              </p>
              <Button onClick={() => setRequestOpen(true)} className="mt-6 rounded-xl bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50">
                <Plus className="w-4 h-4 mr-2" /> Request Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          filtered.map(appt => {
            const d = new Date(appt.date);
            const isUpcoming = (appt.status === "scheduled" || appt.status === "pending") && d >= now;
            return (
              <Card key={appt.id} className="rounded-2xl border-0 shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all overflow-hidden bg-white group">
                <div className="flex flex-col sm:flex-row items-stretch">
                  {/* Date Block */}
                  <div className="w-full sm:w-32 shrink-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white sm:border-r border-b sm:border-b-0 border-slate-200 py-6">
                    <span className="text-xs font-bold text-indigo-500 tracking-widest uppercase mb-1">
                      {d.toLocaleString("default", { month: "short" })}
                    </span>
                    <span className="text-4xl font-serif text-slate-900 leading-none mb-2">{d.getDate()}</span>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            {appt.description}
                          </h3>
                          {appt.purpose && (
                            <p className="text-slate-500 mt-1">{appt.purpose}</p>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 pt-2">
                          <StatusBadge status={appt.status} />
                          <MeetingTypeBadge type={appt.meeting_type} />
                          {appt.duration && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                              <Clock className="w-3.5 h-3.5" /> {appt.duration} min
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-slate-500">
                          {appt.lawyer_id && (
                            <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100">
                              <User className="w-4 h-4 text-indigo-500" /> 
                              <span className="font-medium text-indigo-900">Lawyer: {getLawyerName(appt.lawyer_id)}</span>
                            </div>
                          )}
                          {appt.case_id && (
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="w-4 h-4 text-slate-400" /> {getCaseName(appt.case_id)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap sm:flex-col lg:flex-row items-center justify-end gap-2 shrink-0 md:w-auto w-full border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                        <Button
                          size="sm" variant="ghost"
                          className="h-9 px-3 rounded-xl hover:bg-slate-100 text-slate-600 font-medium"
                          onClick={() => openDetail(appt)}
                        >
                          <Eye className="w-4 h-4 mr-2" /> Details
                        </Button>

                        {isUpcoming && appt.meeting_type === "video" && appt.meeting_link && (
                          <Button
                            size="sm"
                            className="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md font-medium"
                            onClick={() => window.open(appt.meeting_link, "_blank")}
                          >
                            <Video className="w-4 h-4 mr-2" /> Join Call
                          </Button>
                        )}

                        {isUpcoming && (
                          <>
                            {isAdminOrLawyer && appt.status === "pending" && (
                              <Button
                                size="sm"
                                className="h-9 px-4 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium border border-emerald-200"
                                onClick={() => openEdit(appt)}
                              >
                                <Check className="w-4 h-4 mr-2" /> Confirm / Assign
                              </Button>
                            )}
                            
                            {!isAdminOrLawyer && (
                              <Button
                                size="sm" variant="outline"
                                className="h-9 px-3 rounded-xl font-medium border-slate-200"
                                onClick={() => openReschedule(appt)}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" /> Reschedule
                              </Button>
                            )}
                            
                            {isAdminOrLawyer && appt.status === "scheduled" && (
                              <Button
                                size="sm" variant="outline"
                                className="h-9 px-3 rounded-xl font-medium border-slate-200"
                                onClick={() => openEdit(appt)}
                              >
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </Button>
                            )}
                            
                            <Button
                              size="sm" variant="ghost"
                              className="h-9 px-3 rounded-xl text-rose-600 hover:bg-rose-50 font-medium"
                              onClick={() => handleCancel(appt.id)}
                            >
                              <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ── REQUEST APPOINTMENT MODAL ── */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <DialogTitle className="text-xl font-serif">Request an Appointment</DialogTitle>
            <DialogDescription className="text-slate-300 mt-1">Fill out the details below and a staff member will confirm your appointment.</DialogDescription>
          </div>
          <form onSubmit={handleRequest} className="p-6 space-y-5 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Case <span className="font-normal lowercase">(optional)</span></Label>
                <Select value={form.case_id} onValueChange={v => setForm(f => ({ ...f, case_id: v }))}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="No specific case" /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">No specific case</SelectItem>
                    {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {user?.role !== "client" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Client <span className="text-rose-500">*</span></Label>
                  <Select required value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {clients.map(c => <SelectItem key={c.id} value={c.client_id || c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {user?.role !== "lawyer" && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Lawyer <span className="font-normal lowercase">(optional)</span></Label>
                  <Select value={form.lawyer_id} onValueChange={v => setForm(f => ({ ...f, lawyer_id: v }))}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Any available" /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {availableLawyers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {isClient && (
              <div className="flex items-center gap-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors"
                onClick={() => setForm(f => ({ ...f, is_first: !f.is_first, lawyer_id: !f.is_first ? "" : f.lawyer_id }))}>
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${form.is_first ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                  {form.is_first && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <Label className="font-medium text-indigo-900 cursor-pointer">This is my first consultation</Label>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purpose / Subject <span className="text-rose-500">*</span></Label>
              <Input
                required
                placeholder="e.g. Initial Consultation, Case Review"
                value={form.purpose}
                onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Brief Description <span className="text-rose-500">*</span></Label>
              <Input
                required
                placeholder="e.g. Discuss property dispute documents"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Date <span className="text-rose-500">*</span></Label>
                <Input required type="date" min={today} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Time</Label>
                <Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</Label>
                <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v }))}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="90">90 min</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Type</Label>
              <div className="grid grid-cols-3 gap-3">
                {[{ val: "office", Icon: Building2, label: "In-Office" }, { val: "video", Icon: Video, label: "Video Call" }, { val: "phone", Icon: Phone, label: "Phone Call" }].map(({ val, Icon, label }) => (
                  <button
                    type="button" key={val}
                    onClick={() => setForm(f => ({ ...f, meeting_type: val }))}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-medium ${
                      form.meeting_type === val
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                        : "border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Notes <span className="font-normal lowercase">(optional)</span></Label>
              <Textarea
                placeholder="Any additional information or special requests..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="rounded-xl resize-none p-3"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setRequestOpen(false)} className="rounded-xl hover:bg-slate-100">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md transition-all">
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADMIN/LAWYER EDIT / ASSIGN MODAL ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 border-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
            <DialogTitle className="text-xl font-serif">Confirm & Assign Lawyer</DialogTitle>
            <DialogDescription className="text-emerald-50 mt-1">
              Assign a lawyer to this appointment and confirm its status.
            </DialogDescription>
          </div>
          <form onSubmit={handleEdit} className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="scheduled">Scheduled (Confirmed)</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign Lawyer</Label>
              <Select value={editForm.lawyer_id} onValueChange={v => setEditForm(f => ({ ...f, lawyer_id: v }))}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select a Lawyer" /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none">No Lawyer (Clear)</SelectItem>
                  {lawyers.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Assigning a lawyer will notify the client and allow them to message the lawyer directly.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Notes <span className="lowercase font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Add meeting links or private notes..."
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                className="rounded-xl resize-none p-3"
                rows={3}
              />
            </div>

            <DialogFooter className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="rounded-xl hover:bg-slate-100">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-6 shadow-md transition-all">
                {isSubmitting ? "Saving..." : "Confirm & Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── APPOINTMENT DETAILS MODAL ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 border-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <DialogTitle className="text-xl font-serif">Appointment Details</DialogTitle>
          </div>
          {selectedAppt && (() => {
            const d = new Date(selectedAppt.date);
            const isUpcoming = (selectedAppt.status === "scheduled" || selectedAppt.status === "pending") && d >= now;
            return (
              <div className="p-6 bg-white">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-4 text-sm">
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Appointment ID</span><span className="font-mono text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-700">#{selectedAppt.id?.substring(0, 10)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Purpose</span><span className="font-semibold text-slate-900">{selectedAppt.purpose || "—"}</span></div>
                  <div className="flex justify-between items-start"><span className="text-slate-500 font-medium pt-0.5">Description</span><span className="text-right max-w-[200px] text-slate-900">{selectedAppt.description}</span></div>
                  
                  <hr className="border-slate-100" />
                  
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Date & Time</span>
                    <span className="font-semibold text-indigo-700">{d.toLocaleDateString()} at {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Duration</span><span className="text-slate-900">{selectedAppt.duration || 60} minutes</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Meeting Type</span><MeetingTypeBadge type={selectedAppt.meeting_type} /></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Status</span><StatusBadge status={selectedAppt.status} /></div>
                  
                  <hr className="border-slate-100" />

                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Assigned Lawyer</span><span className="font-medium text-slate-900">{selectedAppt.lawyer_id ? getLawyerName(selectedAppt.lawyer_id) : "Unassigned"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Linked Case</span><span className="text-slate-900">{selectedAppt.case_id ? getCaseName(selectedAppt.case_id) : "None"}</span></div>
                  
                  {selectedAppt.meeting_link && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Meeting Link</span>
                      <a href={selectedAppt.meeting_link} target="_blank" rel="noreferrer" className="text-blue-600 flex items-center gap-1 font-medium hover:underline bg-blue-50 px-2 py-1 rounded-md">
                        Join Call <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                  {selectedAppt.notes && (
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Additional Notes</p>
                      <p className="text-slate-800 text-sm bg-amber-50 p-3 rounded-xl border border-amber-100">{selectedAppt.notes}</p>
                    </div>
                  )}
                </div>

                {/* Notification info */}
                <div className="flex items-start gap-3 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 mt-6">
                  <Bell className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div className="text-sm font-medium text-indigo-900">
                    {selectedAppt.status === "pending" && "Your request is currently under review. We will assign a lawyer and confirm shortly."}
                    {selectedAppt.status === "scheduled" && "Appointment confirmed! You'll receive a reminder 24 hours before your meeting."}
                    {selectedAppt.status === "completed" && "This appointment has been marked as completed."}
                    {selectedAppt.status === "cancelled" && "This appointment was cancelled."}
                    {selectedAppt.status === "missed" && "This appointment was not attended."}
                  </div>
                </div>

                {isUpcoming && (
                  <div className="pt-6 mt-2 flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl border-slate-200 font-medium hover:bg-slate-50" onClick={() => { setDetailOpen(false); openReschedule(selectedAppt); }}>
                      <RefreshCw className="w-4 h-4 mr-2" /> Reschedule
                    </Button>
                    <Button variant="ghost" className="rounded-xl text-rose-600 hover:bg-rose-50 font-medium" onClick={() => handleCancel(selectedAppt.id)}>
                      <X className="w-4 h-4 mr-2" /> Cancel Appt
                    </Button>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── RESCHEDULE MODAL ── */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-0 border-0 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <DialogTitle className="text-xl font-serif">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-blue-50 mt-1">Choose a new date and time. The appointment will return to Pending status.</DialogDescription>
          </div>
          <form onSubmit={handleReschedule} className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Date <span className="text-rose-500">*</span></Label>
              <Input required type="date" min={today} value={rescheduleForm.date}
                onChange={e => setRescheduleForm(f => ({ ...f, date: e.target.value }))} className="rounded-xl h-11 border-slate-200 focus:ring-blue-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Time</Label>
              <Input type="time" value={rescheduleForm.time}
                onChange={e => setRescheduleForm(f => ({ ...f, time: e.target.value }))} className="rounded-xl h-11 border-slate-200 focus:ring-blue-500" />
            </div>
            <DialogFooter className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setRescheduleOpen(false)} className="rounded-xl hover:bg-slate-100">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-md transition-all">
                {isSubmitting ? "Saving..." : "Confirm Reschedule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
