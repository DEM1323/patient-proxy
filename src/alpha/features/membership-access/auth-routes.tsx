import { useAuth } from "@workos-inc/authkit-react";
import { useEffect, useRef } from "react";
import { isMembershipAccessConfigured } from "../../env";
import { AccessLoadingView } from "./view";

export function LoginPage() {
  if (!isMembershipAccessConfigured) {
    return <AuthenticationConfigurationMissing />;
  }
  return <ConfiguredLoginPage />;
}

export function CallbackPage() {
  if (!isMembershipAccessConfigured) {
    return <AuthenticationConfigurationMissing />;
  }
  return <AccessLoadingView message="Completing your sign-in" />;
}

function ConfiguredLoginPage() {
  const { signIn } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void signIn({ state: { returnTo: "/" } });
    }
  }, [signIn]);

  return <AccessLoadingView message="Opening Google sign-in" />;
}

function AuthenticationConfigurationMissing() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Authentication is not configured</h1>
      <p className="mt-4 text-slate-600">
        Set the replacement application&apos;s Convex and WorkOS environment variables.
      </p>
    </main>
  );
}
