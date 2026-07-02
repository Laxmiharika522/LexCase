import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Briefcase, Scale, Trophy, Mail, Phone, ShieldCheck, ChevronRight, CheckCircle2, TrendingUp, XCircle, Award } from "lucide-react";

export default function Lawyers() {
  const [lawyers, setLawyers] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLawyer, setSelectedLawyer] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usrRes, caseRes] = await Promise.all([
        api.get("/users"),
        api.get("/cases")
      ]);
      const allUsers = usrRes.data;
      setLawyers(allUsers.filter(u => u.role === "lawyer"));
      setCases(caseRes.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = lawyers.filter(l => 
    !search || 
    l.name?.toLowerCase().includes(search.toLowerCase()) || 
    l.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-zinc-800 to-slate-900 p-8 sm:p-12 shadow-2xl border border-slate-700">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-teal-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-semibold tracking-widest text-emerald-300 uppercase">Legal Team</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Firm <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-teal-200">Attorneys</span>
            </h1>
            <p className="text-slate-300 mt-3 text-lg font-light max-w-xl">
              Directory of firm partners and associates, including case assignments and performance metrics.
            </p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-emerald-200/50" />
            <Input
              placeholder="Search attorneys..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-emerald-500 shadow-xl backdrop-blur-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
          <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Attorneys...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
            <Scale className="w-8 h-8 text-slate-300" />
          </div>
          <div className="text-xl font-serif text-slate-800 mb-2">No attorneys found</div>
          <div className="text-slate-500 max-w-sm mx-auto">Adjust your search filters.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filtered.map(lawyer => {
            // Aggregate Statistics
            const assignedCases = cases.filter(cs => cs.assigned_to === lawyer.id);
            const totalCases = assignedCases.length;
            const casesWon = assignedCases.filter(cs => cs.outcome === 'won').length;
            const casesLost = assignedCases.filter(cs => cs.outcome === 'lost').length;
            const activeCases = assignedCases.filter(cs => cs.status !== 'closed').length;
            const winRate = totalCases > 0 ? Math.round((casesWon / (casesWon + casesLost || 1)) * 100) : 0;

            return (
              <div key={lawyer.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col">
                {/* Card Header */}
                <div className="p-6 border-b border-slate-50 flex items-start justify-between bg-gradient-to-b from-slate-50/50 to-white">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0 shadow-xl">
                      <span className="text-2xl font-serif font-bold">{lawyer.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{lawyer.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1 uppercase tracking-wider font-bold text-[10px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {lawyer.role === 'admin' ? 'Managing Partner' : 'Associate Attorney'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="px-6 py-4 bg-slate-50/50 grid grid-cols-2 gap-4 text-sm border-b border-slate-50">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{lawyer.email || "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{lawyer.phone || "No phone provided"}</span>
                  </div>
                </div>

                {/* Statistics Grid */}
                <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  {/* Total Cases */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                      <Briefcase className="w-3.5 h-3.5" /> Total
                    </div>
                    <div className="text-2xl font-serif text-slate-800">{totalCases}</div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Cases Appointed</div>
                  </div>
                  
                  {/* Active Handling */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600/70">
                      <TrendingUp className="w-3.5 h-3.5" /> Handling
                    </div>
                    <div className="text-2xl font-serif text-slate-800">{activeCases}</div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Active Cases</div>
                  </div>

                  {/* Won Cases */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600/70">
                      <Trophy className="w-3.5 h-3.5" /> Won
                    </div>
                    <div className="text-2xl font-serif text-slate-800">{casesWon}</div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Victorious</div>
                  </div>

                  {/* Win Rate */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600/70">
                      <Award className="w-3.5 h-3.5" /> Win Rate
                    </div>
                    <div className="text-2xl font-serif text-slate-800">{winRate}%</div>
                    <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Success Metric</div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-900 text-slate-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {casesLost > 0 ? (
                      <span className="flex items-center gap-1.5 text-rose-400/80"><XCircle className="w-3.5 h-3.5" /> {casesLost} Cases Lost</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-emerald-400/80"><CheckCircle2 className="w-3.5 h-3.5" /> Flawless Record</span>
                    )}
                  </div>
                  <Button variant="link" onClick={() => setSelectedLawyer(lawyer)} className="h-auto p-0 text-emerald-400 hover:text-emerald-300 font-semibold text-xs">
                    View Full Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedLawyer} onOpenChange={(o) => !o && setSelectedLawyer(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl overflow-hidden p-0 border-0 shadow-2xl">
          {selectedLawyer && (
            <>
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white relative flex items-center gap-6">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-emerald-500 rounded-full blur-[60px] opacity-20"></div>
                <div className="w-20 h-20 rounded-2xl bg-slate-950 text-emerald-400 flex items-center justify-center shrink-0 shadow-2xl border border-slate-700 relative z-10">
                  <span className="text-4xl font-serif font-bold">{selectedLawyer.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="relative z-10">
                  <DialogTitle className="text-3xl font-serif">{selectedLawyer.name}</DialogTitle>
                  <DialogDescription className="text-slate-300 mt-1 uppercase tracking-widest text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                    {selectedLawyer.role === 'admin' ? 'Managing Partner' : 'Associate Attorney'}
                  </DialogDescription>
                </div>
              </div>
              <div className="p-8 space-y-8 bg-white">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-300" /> Email Address</div>
                    <div className="text-sm font-medium text-slate-900">{selectedLawyer.email || "—"}</div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-300" /> Phone Number</div>
                    <div className="text-sm font-medium text-slate-900">{selectedLawyer.phone || "No phone provided"}</div>
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 mb-2">
                    <Briefcase className="w-4 h-4 text-emerald-500" /> Areas of Expertise
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const exps = [...new Set(cases.filter(cs => cs.assigned_to === selectedLawyer.id).map(c => c.practice_area).filter(Boolean))];
                      if (exps.length === 0) return <span className="text-sm text-slate-500 italic">No specific areas recorded yet based on assigned cases.</span>;
                      return exps.map(e => (
                        <span key={e} className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium shadow-sm">
                          {e}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button onClick={() => setSelectedLawyer(null)} className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium h-12">Close Profile</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
