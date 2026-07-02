import os

client_dir = r"c:\SEM4\lexcase\frontend\src\pages\client"
os.makedirs(client_dir, exist_ok=True)

client_dashboard = """import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, CreditCard, CalendarClock, Bell } from "lucide-react";
import axios from "axios";

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ openCases: 0, unpaidInvoices: 0, upcomingAppointments: 0 });

  useEffect(() => {
    // Mock fetching stats, but in reality we can hit the API
    setStats({
      openCases: 1,
      unpaidInvoices: 1,
      upcomingAppointments: 1,
    });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <div className="overline mb-2">Welcome Back</div>
        <h1 className="text-4xl font-serif text-zinc-900 tracking-tight">
          Hello, {user?.name}
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          Here is the latest overview of your legal matters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-sm border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Active Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif">{stats.openCases}</div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Unpaid Invoices</CardTitle>
            <CreditCard className="h-4 w-4 text-[#7F1D1D]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif text-[#7F1D1D]">{stats.unpaidInvoices}</div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-zinc-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Upcoming Meetings</CardTitle>
            <CalendarClock className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-serif">{stats.upcomingAppointments}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-sm border-zinc-200">
          <CardHeader>
            <CardTitle>Recent Updates</CardTitle>
            <CardDescription>Activity on your cases</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="text-sm text-zinc-500 italic">No recent updates.</div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-zinc-200">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Action items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center gap-3 p-3 rounded-sm bg-zinc-50 border border-zinc-100">
                <Bell className="w-4 h-4 text-[#7F1D1D]" />
                <div className="text-sm text-zinc-700">Please review the Retainer Fee invoice.</div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
"""

client_cases = """import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";

export default function ClientCases() {
  const [cases, setCases] = useState([]);
  
  useEffect(() => {
    const fetchCases = async () => {
      try {
        const res = await axios.get("/cases");
        setCases(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCases();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-serif text-zinc-900 tracking-tight">My Cases</h1>
        <p className="text-sm text-zinc-500 mt-1">Track the status and timeline of your matters.</p>
      </div>

      <div className="space-y-4">
        {cases.length === 0 ? (
           <div className="text-sm text-zinc-500">No cases found.</div>
        ) : (
           cases.map(c => (
             <Link key={c.id} to={`/cases/${c.id}`} className="block">
               <Card className="rounded-sm border-zinc-200 hover:border-zinc-300 transition-colors">
                 <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                       <div className="text-xs font-mono text-zinc-400 mb-1">{c.case_number}</div>
                       <div className="font-serif text-lg text-zinc-900">{c.title}</div>
                       <div className="text-sm text-zinc-500 mt-1">{c.description}</div>
                    </div>
                    <div className="flex items-center gap-4">
                       <Badge variant="outline" className="uppercase tracking-widest text-[10px] rounded-sm">
                         {c.status}
                       </Badge>
                       <div className="text-xs text-zinc-400 text-right">
                         <div>Opened</div>
                         <div>{new Date(c.opened_on).toLocaleDateString()}</div>
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
"""

with open(os.path.join(client_dir, "ClientDashboard.jsx"), "w") as f:
    f.write(client_dashboard)

with open(os.path.join(client_dir, "ClientCases.jsx"), "w") as f:
    f.write(client_cases)

print("Created Client views")
