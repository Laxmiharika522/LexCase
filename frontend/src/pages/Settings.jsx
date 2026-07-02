import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Settings as SettingsIcon, Save, Database, Bell, Mail, Clock, ShieldAlert } from "lucide-react";

export default function Settings() {
  const [saving, setSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      toast.success("Settings updated successfully!");
      setSaving(false);
    }, 800);
  };

  const handleBackup = () => {
    toast.success("Database backup initiated. You will receive an email when complete.");
  };

  return (
    <div className="max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <div className="overline mb-2">Configuration</div>
          <h1 className="text-3xl font-serif text-zinc-900 tracking-tight">System Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage firm-wide configurations, security protocols, and backups.</p>
        </div>
      </div>

      <Tabs defaultValue="security" className="w-full">
        <TabsList className="mb-6 h-12 p-1 bg-zinc-100 border border-zinc-200">
          <TabsTrigger value="security" className="h-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Shield className="w-4 h-4 mr-2" />
            Security & Audit
          </TabsTrigger>
          <TabsTrigger value="system" className="h-full px-6 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <SettingsIcon className="w-4 h-4 mr-2" />
            System Preferences
          </TabsTrigger>
        </TabsList>
        
        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="rounded-sm border-zinc-200">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-4">
              <CardTitle className="text-lg">Access & Permissions</CardTitle>
              <CardDescription>Global access rules and authentication limits.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-6" onSubmit={handleSave}>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Two-Factor Authentication (2FA)</Label>
                    <p className="text-sm text-zinc-500">Require 2FA for all administrative accounts.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Session Timeout</Label>
                    <p className="text-sm text-zinc-500">Automatically log out inactive users after 30 minutes.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="pt-4 border-t border-zinc-100">
                  <Button type="submit" disabled={saving} className="rounded-sm bg-zinc-900 text-white">
                    <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Security Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-sm border-zinc-200">
              <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-zinc-500" /> Recent Login History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-medium text-zinc-900">admin@lexcase.com</div>
                        <div className="text-xs text-zinc-500">192.168.1.{100+i} (Windows)</div>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">Today, 10:{i}4 AM</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-sm border-zinc-200">
              <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-4">
                <CardTitle className="text-lg flex items-center">
                  <ShieldAlert className="w-5 h-5 mr-2 text-zinc-500" /> Audit Log
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100">
                  <div className="p-4 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-zinc-900">Invoice Created</div>
                      <div className="text-xs text-zinc-500">By Admin User for Case #1294</div>
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">1 hr ago</div>
                  </div>
                  <div className="p-4 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-zinc-900">User Role Changed</div>
                      <div className="text-xs text-zinc-500">Jane Lawyer updated to Partner</div>
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">3 hrs ago</div>
                  </div>
                  <div className="p-4 flex justify-between items-center text-sm">
                    <div>
                      <div className="font-medium text-zinc-900">Case Status Changed</div>
                      <div className="text-xs text-zinc-500">Acme Corp moved to 'Closed'</div>
                    </div>
                    <div className="text-xs text-zinc-400 font-mono">Yesterday</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card className="rounded-sm border-zinc-200">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-4">
              <CardTitle className="text-lg">Email Configuration</CardTitle>
              <CardDescription>SMTP settings for outgoing platform notifications.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form className="space-y-4" onSubmit={handleSave}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input defaultValue="smtp.mailgun.org" className="rounded-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input defaultValue="587" className="rounded-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input defaultValue="postmaster@lexcase.com" className="rounded-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input type="password" defaultValue="********" className="rounded-sm" />
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={saving} className="rounded-sm bg-zinc-900 text-white hover:bg-zinc-800">
                    <Save className="w-4 h-4 mr-2" /> Save Configuration
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-sm border-zinc-200">
              <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Database className="w-5 h-5 mr-2 text-zinc-500" /> Database Backup
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-zinc-500 mb-6">
                  Initiate a manual backup of the entire MongoDB database including cases, documents, and client records.
                </p>
                <Button onClick={handleBackup} className="w-full rounded-sm bg-[#7F1D1D] hover:bg-[#991B1B] text-white">
                  Backup Now
                </Button>
                <div className="text-xs text-zinc-400 mt-4 text-center">Last backup: Today at 3:00 AM (Automated)</div>
              </CardContent>
            </Card>

            <Card className="rounded-sm border-zinc-200">
              <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-4">
                <CardTitle className="text-lg flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-zinc-500" /> Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Send Daily Digest</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Alert on New Case Assignment</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Invoice Payment Receipts</Label>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
