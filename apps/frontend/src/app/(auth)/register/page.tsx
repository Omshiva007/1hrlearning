'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      await api.post('/auth/register', form);
      await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false,
      });
      router.push('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          const flat: Record<string, string> = {};
          Object.entries(error.errors).forEach(([k, v]) => { flat[k] = v[0]; });
          setErrors(flat);
        } else {
          setErrors({ _root: error.message });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-2">
            Join 1hrLearning — it&apos;s free forever
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {errors._root && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {errors._root}
            </div>
          )}

          {[
            { id: 'displayName', label: 'Display Name', type: 'text', placeholder: 'Jane Doe' },
            { id: 'username', label: 'Username', type: 'text', placeholder: 'janedoe' },
            { id: 'email', label: 'Email', type: 'email', placeholder: 'jane@example.com' },
            { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id} className="space-y-2">
              <label htmlFor={id} className="text-sm font-medium">{label}</label>
              <Input
                id={id}
                type={type}
                value={form[id as keyof typeof form]}
                onChange={(e) => update(id, e.target.value)}
                placeholder={placeholder}
                required
              />
              {errors[id] && <p className="text-xs text-destructive">{errors[id]}</p>}
            </div>
          ))}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
