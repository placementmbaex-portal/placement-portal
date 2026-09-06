import Image from "next/image";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const { error } = await searchParams;
  const message = Array.isArray(error) ? error[0] : error;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-[20px] border border-rule bg-surface p-10 px-7 text-center">
        <Image
          src="/logo-iimc.svg"
          alt="IIM Calcutta"
          width={64}
          height={64}
          className="mx-auto h-16 w-16 object-contain"
        />
        <p className="mt-7 font-body text-[26px] font-bold tracking-[-0.015em] text-navy">
          MBA<span className="text-flame">Ex</span>
        </p>
        <p className="mt-1 font-body text-[13px] uppercase tracking-[0.16em] text-slate">
          Placements
        </p>
        <p className="mx-auto mt-[22px] max-w-[26ch] text-[14px] leading-[1.55] text-slate">
          Sign in with your institute Google account to continue.
        </p>

        {message && (
          <p className="mt-4 rounded-md border border-[rgba(251,88,19,0.28)] bg-[#FDEAE0] px-3 py-2 text-[13px] text-closing">
            {message}
          </p>
        )}

        <GoogleSignInButton />

        <p className="mt-4 text-[11.5px] leading-[1.5] text-shut">
          Only @email.iimcal.ac.in accounts are accepted.
        </p>
      </div>
    </div>
  );
}
