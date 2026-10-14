// Registration collects the minimum account profile and reports backend validation errors in-context.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { registerSchema } from '@1hrlearning/shared';

function flattenValidationErrors(
  fieldErrors: Record<string, string[] | undefined>,
) {
  const flattened: Record<string, string> = {};
  Object.entries(fieldErrors).forEach(([field, messages]) => {
    if (messages?.[0]) flattened[field] = messages[0];
  });
  return flattened;
}

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

    // Run the same schema used by the API before making a request so validation feedback is immediate and consistent.
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(flattenValidationErrors(parsed.error.flatten().fieldErrors));
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/register', parsed.data);
      const signInResult = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });

      // Registration succeeded, but do not enter a protected route unless the follow-up authentication also succeeded.
      if (!signInResult || signInResult.error) {
        setErrors({
          _root:
            'Account created, but automatic sign-in failed. Please sign in manually.',
        });
        return;
      }

      router.push('/dashboard');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.errors) {
          setErrors(flattenValidationErrors(error.errors));
        } else {
          setErrors({ _root: error.message });
        }
      } else {
        // Fetch rejects with a native error when the API is offline, so always surface a useful form-level failure.
        setErrors({
          _root:
            'Unable to reach the registration service. Please try again when the API is available.',
        });
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

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4"
          noValidate
        >
          {errors._root && (
            <div
              role="alert"
              className="p-3 rounded-md bg-destructive/10 text-destructive text-sm"
            >
              {errors._root}
            </div>
          )}

          {[
            {
              id: 'displayName',
              label: 'Display Name',
              type: 'text',
              placeholder: 'Jane Doe',
            },
            {
              id: 'username',
              label: 'Username',
              type: 'text',
              placeholder: 'janedoe',
            },
            {
              id: 'email',
              label: 'Email',
              type: 'email',
              placeholder: 'jane@example.com',
            },
            {
              id: 'password',
              label: 'Password',
              type: 'password',
              placeholder: '••••••••',
            },
          ].map(({ id, label, type, placeholder }) => {
            const errorId = `${id}-error`;
            return (
              <div key={id} className="space-y-2">
                <label htmlFor={id} className="text-sm font-medium">
                  {label}
                </label>
                <Input
                  id={id}
                  type={type}
                  value={form[id as keyof typeof form]}
                  onChange={(e) => update(id, e.target.value)}
                  placeholder={placeholder}
                  required
                  minLength={id === 'password' ? 8 : undefined}
                  aria-invalid={Boolean(errors[id])}
                  aria-describedby={errors[id] ? errorId : undefined}
                />
                {errors[id] && (
                  <p
                    id={errorId}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {errors[id]}
                  </p>
                )}
              </div>
            );
          })}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
