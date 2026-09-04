import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const message = Array.isArray(error) ? error[0] : error;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-xl font-semibold text-balance text-zinc-900 dark:text-zinc-50">
          IIM Calcutta MBAEx Placement Portal
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Sign in with your institute Google account to continue.
        </p>
        {message && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {message}
          </p>
        )}
        <GoogleSignInButton />
      </div>
    </div>
  );
}
