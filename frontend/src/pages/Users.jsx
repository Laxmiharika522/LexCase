import React, { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Edit, Shield, Users as UsersIcon, Mail, Activity, Settings2 } from "lucide-react";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ role: "", is_active: true });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/users");
      setUsers(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({ role: user.role, is_active: user.is_active });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        role: editForm.role,
        is_active: editForm.is_active
      };
      
      const { data } = await api.put(`/users/${selectedUser.id}`, payload);
      setUsers(users.map(u => u.id === selectedUser.id ? data : u));
      toast.success("User updated successfully");
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const adminUsers = users.filter(u => u.role === "admin").length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Premium Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-cyan-500 rounded-full blur-[100px] opacity-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-semibold tracking-widest text-indigo-300 uppercase">Administration</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-serif text-white tracking-tight leading-tight">
              User <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-teal-200">Management</span>
            </h1>
            <p className="text-slate-300 mt-3 text-lg font-light max-w-xl">
              Manage firm staff, client accounts, assign roles, and control security access across the platform.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 text-center min-w-[120px]">
               <div className="text-3xl font-serif text-white">{totalUsers}</div>
               <div className="text-xs text-indigo-200 font-medium uppercase tracking-wider mt-1">Total Users</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 text-center min-w-[120px]">
               <div className="text-3xl font-serif text-white">{activeUsers}</div>
               <div className="text-xs text-emerald-200 font-medium uppercase tracking-wider mt-1">Active Accounts</div>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4 px-6 pt-6">
          <CardTitle className="text-xl font-serif text-slate-900 flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-indigo-500" /> System Users
          </CardTitle>
          <CardDescription className="text-slate-500 mt-1">All registered accounts and their current status.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">Loading Users...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-6 py-4">User Details</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">System Role</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500 text-center">Account Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-700 font-serif font-semibold border border-indigo-100">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {u.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`uppercase text-[10px] font-mono px-2 py-0.5 rounded-sm ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-600'}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-md hover:bg-indigo-50 hover:text-indigo-600 transition-colors" onClick={() => openEditModal(u)}>
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-xl overflow-hidden p-0 border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <DialogTitle className="text-xl font-serif">Edit User Permissions</DialogTitle>
            <DialogDescription className="text-slate-300 mt-1">
              Modify access levels and status for {selectedUser?.name}.
            </DialogDescription>
          </div>
          
          <form onSubmit={handleUpdateUser} className="p-6 space-y-6 bg-white">
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({...editForm, role: v})}>
                <SelectTrigger className="rounded-lg h-11 border-slate-200 focus:ring-indigo-500">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="lawyer">Lawyer</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="space-y-1">
                <Label className="text-sm font-medium text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-500" /> Account Status
                </Label>
                <p className="text-xs text-slate-500">Allow user to log in and access data.</p>
              </div>
              <Switch checked={editForm.is_active} onCheckedChange={(v) => setEditForm({...editForm, is_active: v})} />
            </div>

            <DialogFooter className="pt-4 mt-2 border-t border-slate-100 flex items-center gap-2 justify-end">
              <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-lg hover:bg-slate-100">
                Cancel
              </Button>
              <Button type="submit" className="rounded-lg bg-slate-900 text-white hover:bg-slate-800 px-6">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
