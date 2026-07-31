"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp && (!ageConfirmed || !termsAccepted)) {
      setError(
        "Please confirm you're 13 or older and agree to the Terms of Service and Privacy Policy."
      );
      setLoading(false);
      return;
    }

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (isSignUp) {
      setLoading(false);
      setSignedUp(true);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-sm p-6">
        {signedUp ? (
          <>
            <div className="mb-4 flex justify-center">
              <Mail className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="mb-1 text-center text-lg font-medium">
              Check your email
            </h1>
            <p className="mb-5 text-center text-sm text-muted-foreground">
              We sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Click it to activate your account.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setSignedUp(false)}
            >
              Back to sign in
            </Button>
          </>
        ) : (
          <>
            <h1 className="mb-1 text-lg font-medium">
              {isSignUp ? "Create account" : "Sign in"}
            </h1>
            <p className="mb-5 text-sm text-muted-foreground">
              {isSignUp
                ? "Start finding opportunities that match you."
                : "Welcome back."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {isSignUp && (
                <div className="space-y-3">
                  <label
                    htmlFor="age-confirmation"
                    className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-muted-foreground"
                  >
                    <input
                      id="age-confirmation"
                      type="checkbox"
                      checked={ageConfirmed}
                      onChange={(e) => setAgeConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-foreground"
                    />
                    <span>
                      I am{" "}
                      <span className="font-medium text-foreground">
                        13 years old or older
                      </span>
                      .
                    </span>
                  </label>
                  <label
                    htmlFor="terms-confirmation"
                    className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-muted-foreground"
                  >
                    <input
                      id="terms-confirmation"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-foreground"
                    />
                    <span>
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        onClick={(e) => e.stopPropagation()}
                        className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        onClick={(e) => e.stopPropagation()}
                        className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading || (isSignUp && (!ageConfirmed || !termsAccepted))}
              >
                {loading ? "..." : isSignUp ? "Sign up" : "Sign in"}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {isSignUp
                ? "Already have an account?"
                : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setAgeConfirmed(false);
                  setTermsAccepted(false);
                }}
                className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          </>
        )}
      </Card>
    </div>
  );
}
