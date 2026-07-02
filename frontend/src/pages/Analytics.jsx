import React, { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trophy, TrendingDown, Scale, BarChart, Users, DollarSign, ArrowUpRight, ArrowDownRight, Briefcase } from "lucide-react";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get("/analytics");
      setData(res.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Aggregating Data...</div>
      </div>
    );
  }

  // Calculate totals for quick stats
  const totalRevenue = data.client_performance?.reduce((acc, c) => acc + c.total_paid, 0) || 0;
  const totalPending = data.client_performance?.reduce((acc, c) => acc + c.total_pending, 0) || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BarChart className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Firm Performance</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              Reports & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-teal-200">Analytics</span>
            </h1>
            <p className="text-slate-300 mt-3 text-lg font-light max-w-xl">
              Track case outcomes, lawyer productivity, client billing, and overall firm growth in real-time.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 text-center min-w-[140px]">
               <div className="text-3xl font-serif text-white">${(totalRevenue / 1000).toFixed(1)}k</div>
               <div className="text-xs text-indigo-200 font-medium uppercase tracking-wider mt-1">Total Revenue</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 text-center min-w-[140px]">
               <div className="text-3xl font-serif text-white">{data.cases_won}</div>
               <div className="text-xs text-emerald-200 font-medium uppercase tracking-wider mt-1">Cases Won</div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: "Cases Won", value: data.cases_won, icon: Trophy, gradient: "from-emerald-400 to-teal-500", trend: "up" },
          { label: "Cases Lost", value: data.cases_lost, icon: TrendingDown, gradient: "from-rose-400 to-red-500", trend: "down" },
          { label: "Revenue Collected", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, gradient: "from-blue-500 to-indigo-600", trend: "up" },
          { label: "Pending Payments", value: `$${totalPending.toLocaleString()}`, icon: Briefcase, gradient: "from-amber-400 to-orange-500", trend: "neutral" },
        ].map((stat, i) => (
          <Card key={i} className="relative overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white rounded-xl">
            <div className={`absolute top-0 w-full h-1 bg-gradient-to-r ${stat.gradient}`}></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl sm:text-3xl font-serif text-slate-800 tracking-tight">{stat.value}</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1 flex items-center gap-1">
                    {stat.label}
                    {stat.trend === "up" && <ArrowUpRight className="w-3 h-3 text-emerald-500" />}
                    {stat.trend === "down" && <ArrowDownRight className="w-3 h-3 text-rose-500" />}
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${stat.gradient} bg-opacity-10 shadow-inner`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Lawyer Performance */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 px-6 pt-6">
            <CardTitle className="text-xl font-serif text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-500" /> Lawyer Performance
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">Active and closed cases per attorney.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-6">Lawyer</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Active</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Closed</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right px-6">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lawyer_performance.map((l, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-900 px-6">{l.name}</TableCell>
                    <TableCell className="text-right text-amber-600 font-mono font-medium">{l.active_cases}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-mono font-medium">{l.closed_cases}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-900 px-6">{l.total_cases}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Monthly Reports */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 px-6 pt-6">
            <CardTitle className="text-xl font-serif text-slate-900 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-indigo-500" /> Monthly Trends
            </CardTitle>
            <CardDescription className="text-slate-500 mt-1">Volume of intake vs closures over time.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-6">Month</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Cases Opened</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right px-6">Cases Closed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.monthly_reports.map((m, i) => (
                  <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-900 px-6">{m.name}</TableCell>
                    <TableCell className="text-right text-indigo-600 font-mono font-medium">{m.opened}</TableCell>
                    <TableCell className="text-right text-emerald-600 font-mono font-medium px-6">{m.closed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Client Reports (NEW) */}
        <Card className="lg:col-span-2 border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 px-6 pt-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-serif text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> Client Intelligence
                </CardTitle>
                <CardDescription className="text-slate-500 mt-1">Financial breakdown and case volume per client.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {data.client_performance?.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-500">No client data available yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">Client Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Total Cases</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Revenue (Paid)</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-right px-6">Pending Dues</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.client_performance?.map((c, i) => (
                      <TableRow key={i} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="font-medium text-slate-900">{c.name}</div>
                          <div className="text-xs text-slate-500">{c.email}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 w-6 h-6 rounded text-xs font-bold font-mono">
                            {c.total_cases}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-mono font-medium">
                          ${c.total_paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right text-amber-600 font-mono font-medium px-6">
                          ${c.total_pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
