"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const continueAsGuest = () => {
    try {
      window.sessionStorage.setItem("ub-guest", "true");
    } catch {
      // storage unavailable — continue anyway
    }
    router.push("/calculator");
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-8">
      <div className="card w-full text-center">
        <Image
          src="/images/ub-logo.webp"
          alt="United Benefits"
          width={200}
          height={60}
          priority
          className="mx-auto h-12 w-auto"
        />
        <h1 className="mt-6 text-2xl font-bold">Sign in to save your progress</h1>
        <p className="mt-2 text-gray-600">
          Get your personalized federal retirement report in about five minutes.
        </p>

        <form
          className="mt-6 space-y-3 text-left"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <label htmlFor="login-email" className="label">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            required
            className="input"
            placeholder="you@example.gov"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSent(false);
            }}
          />
          <button type="submit" className="btn-secondary w-full">
            Send magic link
          </button>
          {sent && (
            <p className="rounded-lg border border-gold/50 bg-gold/10 px-4 py-3 text-sm text-gray-700" role="status">
              Check your email — magic links are coming soon. Continue as guest for now.
            </p>
          )}
        </form>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-gray-500">or</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button type="button" className="btn-primary w-full" onClick={continueAsGuest}>
          Continue as guest
        </button>
        <p className="mt-3 text-xs text-gray-500">
          Guest sessions are stored only in your browser and cleared when you close the tab.
        </p>
      </div>
    </div>
  );
}
