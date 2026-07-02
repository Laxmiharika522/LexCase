import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, Shield, Phone, Save, Eye, EyeOff,
  CheckCircle2, Mail, MapPin, Lock, Loader2
} from "lucide-react";
import { api } from "@/lib/apiClient";

const ROLE_CONFIG = {
  admin:  { label: "Administrator",   cls: "bg-purple-100 text-purple-700 border-purple-200" },
  lawyer: { label: "Attorney at Law", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  client: { label: "Client",          cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

function Avatar({ name, size = "xl" }) {
  const initials = name
    ? name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const sz = size === "xl" ? "w-20 h-20 text-2xl" : "w-12 h-12 text-base";
  return (
    <div className={`${sz} bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shrink-0 shadow-lg shadow-indigo-200`}>
      {initials}
    </div>
  );
}

function SectionCard({ icon: Icon, iconColor, title, description, children, footer }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 py-6">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-end">
          {footer}
        </div>
      )}
    </div>
  );
}

function FormField({ id, label, icon: Icon, children, hint }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

function SaveButton({ loading, label = "Save Changes", icon: Icon = Save }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
}

function PasswordInput({ id, value, onChange, placeholder, required, minLength }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="rounded-xl pr-10 border-zinc-300 focus-visible:ring-indigo-400 h-10"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function Profile() {
  const { user, refresh, formatApiError } = useAuth();

  const [personalDetails, setPersonalDetails] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [emergencyContact, setEmergencyContact] = useState({
    name: user?.emergency_contact?.name || "",
    relationship: user?.emergency_contact?.relationship || "",
    phone: user?.emergency_contact?.phone || "",
  });

  const [loadingPersonal, setLoadingPersonal] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingEmergency, setLoadingEmergency] = useState(false);

  useEffect(() => {
    if (user) {
      setPersonalDetails({ name: user.name || "", email: user.email || "", phone: user.phone || "", address: user.address || "" });
      setEmergencyContact({ name: user.emergency_contact?.name || "", relationship: user.emergency_contact?.relationship || "", phone: user.emergency_contact?.phone || "" });
    }
  }, [user]);

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setLoadingPersonal(true);
    try {
      await api.put("/auth/me/profile", personalDetails);
      await refresh();
      toast.success("Personal details updated successfully.");
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoadingPersonal(false); }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("New passwords do not match."); return; }
    setLoadingPassword(true);
    try {
      await api.put("/auth/me/password", { current_password: passwordForm.currentPassword, new_password: passwordForm.newPassword });
      toast.success("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoadingPassword(false); }
  };

  const handleSaveEmergency = async (e) => {
    e.preventDefault();
    setLoadingEmergency(true);
    try {
      await api.put("/auth/me/emergency_contact", emergencyContact);
      await refresh();
      toast.success("Emergency contact updated successfully.");
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoadingEmergency(false); }
  };

  const roleConfig = ROLE_CONFIG[user?.role] || { label: user?.role, cls: "bg-zinc-100 text-zinc-600 border-zinc-200" };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Profile Hero Card ── */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-500"></div>

        {/* Info Row */}
        <div className="px-6 pb-5">
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div className="ring-4 ring-white rounded-full shadow-lg">
              <Avatar name={user?.name} size="xl" />
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${roleConfig.cls}`}>
              {roleConfig.label}
            </span>
          </div>
          <h1 className="text-2xl font-serif font-semibold text-zinc-900">{user?.name || "Your Name"}</h1>
          <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            {user?.email}
          </p>
          {user?.phone && (
            <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              {user.phone}
            </p>
          )}
        </div>
      </div>

      {/* ── Personal Details ── */}
      <SectionCard
        icon={User}
        iconColor="bg-indigo-50 text-indigo-600"
        title="Personal Details"
        description="Your contact information visible to firm staff."
        footer={<SaveButton loading={loadingPersonal} label="Save Details" />}
      >
        <form id="form-personal" onSubmit={handleSavePersonal}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField id="name" label="Full Name" icon={User}>
              <Input
                id="name"
                value={personalDetails.name}
                onChange={e => setPersonalDetails(p => ({ ...p, name: e.target.value }))}
                className="rounded-xl border-zinc-300 focus-visible:ring-indigo-400 h-10"
                placeholder="Your full name"
              />
            </FormField>

            <FormField
              id="email"
              label="Email Address"
              icon={Mail}
              hint="Email is managed by your administrator."
            >
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={personalDetails.email}
                  disabled
                  className="rounded-xl border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed h-10 pr-9"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-300" />
              </div>
            </FormField>

            <FormField id="phone" label="Phone Number" icon={Phone}>
              <Input
                id="phone"
                placeholder="+1 (555) 000-0000"
                value={personalDetails.phone}
                onChange={e => setPersonalDetails(p => ({ ...p, phone: e.target.value }))}
                className="rounded-xl border-zinc-300 focus-visible:ring-indigo-400 h-10"
              />
            </FormField>

            <FormField id="address" label="Mailing Address" icon={MapPin}>
              <Input
                id="address"
                placeholder="123 Legal Way, City, ST 12345"
                value={personalDetails.address}
                onChange={e => setPersonalDetails(p => ({ ...p, address: e.target.value }))}
                className="rounded-xl border-zinc-300 focus-visible:ring-indigo-400 h-10"
              />
            </FormField>
          </div>
        </form>
      </SectionCard>

      {/* ── Security ── */}
      <SectionCard
        icon={Shield}
        iconColor="bg-amber-50 text-amber-600"
        title="Security & Password"
        description="Keep your account secure with a strong, unique password."
        footer={<SaveButton loading={loadingPassword} label="Update Password" icon={Lock} />}
      >
        <form id="form-password" onSubmit={handleSavePassword}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <FormField id="currentPassword" label="Current Password" icon={Lock}>
                <PasswordInput
                  id="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  required
                  placeholder="Your current password"
                />
              </FormField>
            </div>

            <FormField id="newPassword" label="New Password" icon={Shield}>
              <PasswordInput
                id="newPassword"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />
            </FormField>

            <FormField id="confirmPassword" label="Confirm New Password" icon={CheckCircle2}>
              <PasswordInput
                id="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required
                minLength={6}
                placeholder="Repeat new password"
              />
            </FormField>

            {passwordForm.newPassword && passwordForm.confirmPassword && (
              <div className="sm:col-span-2">
                {passwordForm.newPassword === passwordForm.confirmPassword ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-rose-500 font-medium">
                    <Shield className="w-3.5 h-3.5" /> Passwords do not match
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
      </SectionCard>

      {/* ── Emergency Contact ── */}
      {user?.role !== "admin" && (
        <SectionCard
          icon={Phone}
          iconColor="bg-rose-50 text-rose-600"
          title="Emergency Contact"
          description="A trusted person we can reach out to on your behalf if needed."
          footer={<SaveButton loading={loadingEmergency} label="Save Contact" />}
        >
          <form id="form-emergency" onSubmit={handleSaveEmergency}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <FormField id="ecName" label="Contact Name" icon={User}>
                  <Input
                    id="ecName"
                    value={emergencyContact.name}
                    onChange={e => setEmergencyContact(p => ({ ...p, name: e.target.value }))}
                    className="rounded-xl border-zinc-300 focus-visible:ring-indigo-400 h-10 sm:max-w-sm"
                    placeholder="Full name of your contact"
                  />
                </FormField>
              </div>

              <FormField id="ecRelationship" label="Relationship" icon={User}>
                <Input
                  id="ecRelationship"
                  placeholder="e.g. Spouse, Parent, Sibling"
                  value={emergencyContact.relationship}
                  onChange={e => setEmergencyContact(p => ({ ...p, relationship: e.target.value }))}
                  className="rounded-xl border-zinc-300 focus-visible:ring-indigo-400 h-10"
                />
              </FormField>

              <FormField id="ecPhone" label="Phone Number" icon={Phone}>
                <Input
                  id="ecPhone"
                  placeholder="+1 (555) 000-0000"
                  value={emergencyContact.phone}
                  onChange={e => setEmergencyContact(p => ({ ...p, phone: e.target.value }))}
                  className="rounded-xl border-zinc-300 focus-visible:ring-indigo-400 h-10"
                />
              </FormField>
            </div>
          </form>
        </SectionCard>
      )}

    </div>
  );
}
