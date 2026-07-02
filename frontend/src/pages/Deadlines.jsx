import React, { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Plus, Trash2, CalendarClock, CalendarDays, CheckCircle2, Clock, Calendar as CalendarIcon, Briefcase } from "lucide-react";

const PRI = ["low","medium","high","urgent"];
const PC = {
  urgent: "bg-rose-100 text-rose-800 border-rose-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function Deadlines() {
  const [tasks, setTasks] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", due_date: "", priority: "medium", case_id: "no_case", description: "" });
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/tasks");
      setTasks(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    api.get("/cases").then((r) => setCases(r.data)).catch(console.error); 
  }, []);

  const dateStr = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");

  const dueDates = useMemo(
    () => tasks.filter((t) => t.status !== "done").map((t) => new Date(t.due_date)),
    [tasks],
  );

  const forDate = tasks.filter((t) => (t.due_date || "").slice(0, 10) === dateStr(selectedDate));
  
  const upcomingTasks = tasks
    .filter((t) => t.status !== "done" && new Date(t.due_date) >= new Date())
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const submit = async () => {
    try {
      if (!form.title || !form.due_date) { toast.error("Title & due date required"); return; }
      setIsCreating(true);
      const payload = { title: form.title, due_date: form.due_date, priority: form.priority, case_id: form.case_id === "no_case" || !form.case_id ? null : form.case_id, description: form.description };
      await api.post("/tasks", payload);
      toast.success("Deadline added successfully");
      setOpen(false); 
      setForm({ title: "", due_date: "", priority: "medium", case_id: "no_case", description: "" }); 
      load();
    } catch (err) { 
      toast.error(formatApiError(err)); 
    } finally {
      setIsCreating(false);
    }
  };

  const toggle = async (t) => {
    try {
      await api.put(`/tasks/${t.id}`, { status: t.status === "done" ? "pending" : "done" });
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const remove = async (t) => {
    if (!window.confirm("Delete this deadline?")) return;
    try {
      await api.delete(`/tasks/${t.id}`); 
      toast.success("Deadline removed");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-rose-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Calendar & Milestones</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Tasks & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-rose-200">Deadlines</span>
            </h1>
            <p className="text-slate-300 mt-3 text-lg font-light max-w-xl">
              Track court dates, filings, internal review milestones, and team tasks.
            </p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-12 px-6 bg-white text-slate-900 hover:bg-slate-100 shadow-xl transition-all border-0 font-medium">
                <Plus className="w-5 h-5 mr-2 text-indigo-600" />
                New Deadline
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] rounded-2xl overflow-hidden p-0 border-0 shadow-2xl">
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
                <DialogTitle className="text-xl font-serif">Create New Deadline</DialogTitle>
                <DialogDescription className="text-slate-300 mt-1">
                  Schedule a new task, filing date, or court appearance.
                </DialogDescription>
              </div>
              <div className="p-6 space-y-5 bg-white">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</Label>
                  <Input placeholder="e.g. File motion to dismiss" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500" data-testid="deadline-title-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</Label>
                  <Textarea placeholder="Task details..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg border-slate-200 focus:ring-indigo-500 resize-none min-h-[80px]" data-testid="deadline-desc-input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due date</Label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500" data-testid="deadline-due-input" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRI.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Link to case (optional)</Label>
                  <Select value={form.case_id || undefined} onValueChange={(v) => setForm({ ...form, case_id: v })}>
                    <SelectTrigger className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500">
                      <SelectValue placeholder="No case linked" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no_case">No case</SelectItem>
                      {cases.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-lg hover:bg-slate-100">Cancel</Button>
                  <Button onClick={submit} disabled={isCreating} className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-md transition-all" data-testid="create-deadline-submit-btn">
                    {isCreating ? "Saving..." : "Create Deadline"}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Calendar & Overview */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-500" /> Select Date
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                modifiers={{ due: dueDates }}
                modifiersStyles={{
                  due: { 
                    fontWeight: 'bold', 
                    backgroundColor: '#e0e7ff', 
                    color: '#4338ca',
                    borderRadius: '8px'
                  }
                }}
                className="mx-auto border-0"
                data-testid="deadlines-calendar"
              />
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl overflow-hidden bg-white">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-400 to-purple-500"></div>
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" /> Upcoming (Next 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingTasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">No upcoming tasks.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcomingTasks.map((t) => (
                    <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col gap-1">
                      <div className="flex justify-between items-start gap-4">
                        <span className="text-sm font-medium text-slate-800 line-clamp-1">{t.title}</span>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded shrink-0">
                          {new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {t.description && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {t.description}
                        </div>
                      )}
                      {t.case_title && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                          <Briefcase className="w-3 h-3" /> {t.case_title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Tasks for Selected Date */}
        <section className="lg:col-span-8">
          <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white h-full">
            <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 px-6 pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl font-serif text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-500" /> Schedule for {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-1">
                    Showing tasks and deadlines due on this specific date.
                  </CardDescription>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-serif text-lg border border-indigo-100">
                  {forDate.length}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="min-h-[40vh] flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Tasks...</div>
                </div>
              ) : forDate.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <CheckCircle2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <div className="text-lg font-serif text-slate-900 mb-1">You're all clear!</div>
                  <div className="text-sm text-slate-500">There are no deadlines scheduled for this day.</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {forDate.map((t) => (
                    <div key={t.id} className="flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-colors group" data-testid={`day-task-${t.id}`}>
                      <div className="relative flex items-center justify-center">
                        <input 
                          type="checkbox" 
                          checked={t.status === "done"} 
                          onChange={() => toggle(t)} 
                          className="w-5 h-5 cursor-pointer accent-indigo-600 rounded border-slate-300 focus:ring-indigo-600 transition-all"
                        />
                      </div>
                      
                      <div className={`flex-1 transition-all ${t.status === "done" ? "opacity-50" : ""}`}>
                        <div className={`text-base font-medium ${t.status === "done" ? "line-through text-slate-500" : "text-slate-900"}`}>
                          {t.title}
                        </div>
                        {t.description && (
                          <div className={`text-sm mt-1 ${t.status === "done" ? "text-slate-400" : "text-slate-600"}`}>
                            {t.description}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          {t.case_title && (
                            <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Briefcase className="w-3 h-3" />
                              {t.case_title}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${PC[t.priority]}`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => remove(t)} 
                        className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
