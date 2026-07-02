import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Briefcase, Search, ChevronRight, User, Scale, Clock } from "lucide-react";

const STATUS_COLOR = {
  intake:  "bg-purple-100 text-purple-800",
  open:    "bg-blue-100 text-blue-800",
  on_hold: "bg-amber-100 text-amber-800",
  closed:  "bg-zinc-100 text-zinc-600",
};
const STATUS_LABEL = { intake: "Intake", open: "Open", on_hold: "On Hold", closed: "Closed" };
const PRIORITY_COLOR = {
  urgent: "bg-[#7F1D1D] text-white",
  high:   "bg-red-100 text-red-800",
  medium: "bg-amber-100 text-amber-800",
  low:    "bg-zinc-100 text-zinc-700",
};

export default function ClientCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [caseRes, usrRes] = await Promise.all([
        api.get("/cases"),
        api.get("/users"),
      ]);
      setCases(caseRes.data);
      setLawyers(usrRes.data.filter(u => u.role === "lawyer" || u.role === "admin"));
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const getLawyerName = (id) => lawyers.find(l => l.id === id)?.name || "Unassigned";

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.case_number?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  const TABS = [
    { key: "all",     label: "All Cases" },
    { key: "open",    label: "Open" },
    { key: "on_hold", label: "On Hold" },
    { key: "closed",  label: "Closed" },
  ];

  return (
    <div className="max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div>
        <div className="overline mb-2">Client Portal</div>
        <h1 className="text-3xl font-serif text-zinc-900 tracking-tight">My Cases</h1>
        <p className="text-sm text-zinc-500 mt-1">Track the status and progress of all your legal matters.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Cases", value: cases.length, color: "text-zinc-900" },
          { label: "Active", value: cases.filter(c => c.status === "open").length, color: "text-blue-600" },
          { label: "On Hold", value: cases.filter(c => c.status === "on_hold").length, color: "text-amber-600" },
          { label: "Closed", value: cases.filter(c => c.status === "closed").length, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="rounded-sm border-zinc-200">
            <CardContent className="pt-5">
              <div className={`text-2xl font-serif ${color}`}>{loading ? "—" : value}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex border border-zinc-200 rounded-sm overflow-hidden">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === tab.key ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input placeholder="Search cases..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9 w-64 rounded-sm text-sm border-zinc-200" />
        </div>
      </div>

      {/* Case List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-10 text-center text-sm text-zinc-400">Loading your cases...</div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-sm border-zinc-200">
            <CardContent className="py-16 text-center">
              <Scale className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
              <p className="font-medium text-zinc-700">No cases found</p>
              <p className="text-sm text-zinc-400 mt-1">No cases match your current filter.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map(c => (
            <Link key={c.id} to={`/cases/${c.id}`} className="block group">
              <Card className="rounded-sm border-zinc-200 hover:border-zinc-300 hover:shadow-sm transition-all">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Status bar */}
                    <div className={`w-1 rounded-l-sm shrink-0 ${
                      c.status === "open" ? "bg-blue-500" :
                      c.status === "on_hold" ? "bg-amber-400" :
                      c.status === "closed" ? "bg-zinc-300" : "bg-purple-400"
                    }`} />
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-zinc-400">{c.case_number}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-sm ${PRIORITY_COLOR[c.priority] || PRIORITY_COLOR.low}`}>
                              {c.priority}
                            </span>
                          </div>
                          <h3 className="font-serif text-lg text-zinc-900 leading-tight">{c.title}</h3>
                          {c.description && (
                            <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{c.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-500">
                            {c.assigned_to && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {getLawyerName(c.assigned_to)}
                              </span>
                            )}
                            {c.practice_area && (
                              <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> {c.practice_area}
                              </span>
                            )}
                            {c.opened_on && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Opened {new Date(c.opened_on).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`text-xs font-medium px-2 py-1 rounded-sm ${STATUS_COLOR[c.status] || "bg-zinc-100 text-zinc-600"}`}>
                            {STATUS_LABEL[c.status] || c.status}
                          </span>
                          <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 mt-auto transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
