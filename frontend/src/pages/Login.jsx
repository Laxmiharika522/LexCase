import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome to LexCase");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Form */}
      <div className="flex items-center justify-center p-8 md:p-16 order-2 md:order-1">
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

          <div className="overline mb-3">Firm access</div>
          <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-none mb-3">
            Sign in to your practice.
          </h1>
          <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
            Access your cases, deadlines and confidential client documents. All connections are encrypted end-to-end.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="overline">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                className="mt-2 rounded-sm border-zinc-300 h-11"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="overline">Password</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-sm border-zinc-300 h-11 pr-10"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-sm h-11 bg-[#7F1D1D] hover:bg-[#991B1B] text-white"
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in…" : "Sign in →"}
            </Button>
          </form>

          <div className="mt-8 text-sm text-zinc-500">
            New to LexCase?{" "}
            <Link to="/register" className="text-[#7F1D1D] hover:underline" data-testid="register-link">
              Create an account
            </Link>
          </div>

          <div className="mt-10 pt-6 border-t border-zinc-200 text-xs text-zinc-400 font-mono">
            DEMO · admin@lexcase.com / Admin@123
          </div>
        </div>
      </div>

      {/* Image side */}
      <div className="relative hidden md:block order-1 md:order-2 bg-zinc-900 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.pexels.com/photos/8112154/pexels-photo-8112154.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')",
            filter: "grayscale(1) contrast(1.05)",
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
          <div className="overline text-white/70">Est. Vol. XII — Practice Notes</div>
          <h2 className="font-serif text-4xl leading-tight mt-4 max-w-md">
            "The single most important discipline in the practice of law is order."
          </h2>
          <div className="mt-4 text-sm text-white/70 font-mono">— Louis D. Brandeis</div>
        </div>
      </div>
    </div>
  );
}
