import { useState } from "react";
import { useLocation } from "wouter";
import { Card, Input, Label, Button } from "@/components/ui";
import { Mail, Lock, Fingerprint } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLocation("/");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl"></div>

      <Card className="w-full max-w-md p-8 shadow-2xl relative z-10 border-0 bg-white/95 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/30 mb-4 transform rotate-3">
            <Fingerprint className="w-8 h-8 text-white -rotate-3" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">PostHRMS Login</h1>
          <p className="text-sm text-gray-500 mt-2">Sign in to manage attendance and workforce</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-gray-700">Username or Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input required placeholder="admin@postoffice.com" className="pl-10 py-2.5 bg-gray-50" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="text-gray-700">Password</Label>
              <a href="#" className="text-xs text-primary hover:underline font-medium">Forgot password?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input required type="password" placeholder="••••••••" className="pl-10 py-2.5 bg-gray-50" />
            </div>
          </div>

          <Button type="submit" className="w-full py-2.5 text-base mt-2 shadow-lg shadow-primary/25" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Dashboard"}
          </Button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Secure Enterprise Portal • ZKteco Integrated</p>
        </div>
      </Card>
    </div>
  );
}
