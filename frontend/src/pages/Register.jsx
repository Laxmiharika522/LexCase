import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "lawyer" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      <div className="flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-[#7F1D1D] flex items-center justify-center rounded-sm">
              <Scale className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <div className="font-serif text-xl leading-none">LexCase</div>
              <div className="overline mt-1">Legal · Confidential</div>
            </div>
          </div>

          <div className="overline mb-3">New Account</div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">
            Join your firm's workspace.
          </h1>
          <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
            Register a client, lawyer, or administrator account. Confidential by default.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label className="overline">Full name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 rounded-sm h-11" data-testid="register-name-input" />
            </div>
            <div>
              <Label className="overline">Email</Label>
              <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2 rounded-sm h-11" data-testid="register-email-input" />
            </div>
            <div>
              <Label className="overline">Password</Label>
              <div className="relative mt-2">
                <Input required type={showPassword ? "text" : "password"} minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-sm h-11 pr-10" data-testid="register-password-input" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="overline">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger className="mt-2 rounded-sm h-11" data-testid="register-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lawyer">Lawyer</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading} className="w-full rounded-sm h-11 bg-[#7F1D1D] hover:bg-[#991B1B] text-white" data-testid="register-submit-btn">
              {loading ? "Creating…" : "Create account →"}
            </Button>
          </form>

          <div className="mt-8 text-sm text-zinc-500">
            Already have an account?{" "}
            <Link to="/login" className="text-[#7F1D1D] hover:underline" data-testid="login-link">Sign in</Link>
          </div>
        </div>
      </div>

      <div className="relative hidden md:block bg-zinc-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1527576539890-dfa815648363?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMGFyY2hpdGVjdHVyZXxlbnwwfHx8YmxhY2tfYW5kX3doaXRlfDE3ODI5NjY4MTZ8MA&ixlib=rb-4.1.0&q=85')", filter: "grayscale(1) contrast(1.05)" }} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <div className="overline text-white/70">Confidential by design</div>
          <h2 className="font-serif text-4xl leading-tight mt-4 max-w-md">Structure, precedent, and precision.</h2>
        </div>
      </div>
    </div>
  );
}
