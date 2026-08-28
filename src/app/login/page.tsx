'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [branchId, setBranchId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{id: string, name: string}[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  const [step, setStep] = useState<'credentials' | 'branch'>('credentials');
  const [verifiedRole, setVerifiedRole] = useState('');
  const [verifiedBranchId, setVerifiedBranchId] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetch('/api/auth/branches')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBranches(data);
        }
      })
      .catch(err => console.error('Error fetching branches:', err))
      .finally(() => setBranchesLoading(false));
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerifying(true);

    try {
      const res = await fetch('/api/auth/pre-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setVerifying(false);
        return;
      }

      setVerifiedRole(data.role);
      setVerifiedBranchId(data.branchId || '');

      if (data.canChooseBranch) {
        setStep('branch');
        setVerifying(false);
      } else {
        setBranchId(data.branchId || '');
        setVerifying(false);
        await doSignIn(data.branchId || '');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setVerifying(false);
    }
  };

  const doSignIn = async (selectedBranch: string) => {
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        branchId: selectedBranch,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      const role = sessionData?.user?.role;
      if (role === 'fuel_attendant') {
        router.push('/fleet/attendant');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSignIn(branchId);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mine-blue-950 via-mine-blue-900 to-slate-900">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Mineazy" className="h-40 w-40 object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Mineazy ERP</h1>
          <p className="text-slate-400 mt-2">Enterprise Resource Planning System</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-slate-900">
              {step === 'credentials' ? 'Sign In' : 'Select Branch'}
            </CardTitle>
            <CardDescription>
              {step === 'credentials'
                ? 'Enter your credentials to access the system'
                : `Logged in as ${verifiedRole.charAt(0).toUpperCase() + verifiedRole.slice(1).replace('_', ' ')}. Choose a branch.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'credentials' ? (
              <form onSubmit={handleVerify} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Button type="submit" className="w-full h-11" loading={verifying}>
                  {verifying ? 'Verifying...' : <>Continue <ArrowRight className="h-4 w-4 ml-2" /></>}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleBranchSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <Select
                  label="Branch"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  options={branches.map(b => ({ value: b.id, label: b.name }))}
                  placeholder={branchesLoading ? "Loading branches..." : "Select a branch"}
                  disabled={branchesLoading}
                />

                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 h-11" onClick={() => { setStep('credentials'); setError(''); setVerifiedRole(''); }}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 h-11" loading={loading} disabled={!branchId}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-xs mt-6">
          &copy; {new Date().getFullYear()} Mineazy Mining Solutions. All rights reserved.
        </p>
      </div>
    </div>
  );
}
