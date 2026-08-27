"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type FillerType = "individual" | "advisor";

export interface IntakeInfo {
  filler: FillerType;
  name: string;
  phone: string;
  email: string;
  description: string;
}

export default function IntakePage() {
  const router = useRouter();
  const [filler, setFiller] = useState<FillerType | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const isAdvisor = filler === "advisor";

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filler) {
      setError("Please choose who is filling this out.");
      return;
    }
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError("Please fill in name, phone number, and email.");
      return;
    }
    setError("");
    const intake: IntakeInfo = {
      filler,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      description: description.trim(),
    };
    try {
      window.sessionStorage.setItem("ub-intake", JSON.stringify(intake));
    } catch {
      // storage unavailable — continue anyway
    }
    router.push("/calculator");
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-8">
      <div className="card w-full">
        <Image
          src="/images/ub-logo.webp"
          alt="United Benefits"
          width={200}
          height={60}
          priority
          className="mx-auto h-12 w-auto"
        />
        <h1 className="mt-6 text-center text-2xl font-bold">
          Before we begin
        </h1>
        <p className="mt-2 text-center text-gray-600">
          Tell us who&apos;s filling this out so we can tailor your report.
        </p>

        <form className="mt-6 space-y-5" onSubmit={start}>
          <fieldset>
            <legend className="label">Who is filling this out?</legend>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFiller("individual")}
                aria-pressed={filler === "individual"}
                className={`min-h-[64px] rounded-xl border-2 px-4 py-3 text-left transition ${
                  filler === "individual"
                    ? "border-navy bg-navy text-white"
                    : "border-gray-200 bg-white hover:border-navy/50"
                }`}
              >
                <span className="block font-semibold">An individual</span>
                <span className={`block text-sm ${filler === "individual" ? "text-white/80" : "text-gray-500"}`}>
                  I&apos;m planning my own retirement
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFiller("advisor")}
                aria-pressed={filler === "advisor"}
                className={`min-h-[64px] rounded-xl border-2 px-4 py-3 text-left transition ${
                  filler === "advisor"
                    ? "border-navy bg-navy text-white"
                    : "border-gray-200 bg-white hover:border-navy/50"
                }`}
              >
                <span className="block font-semibold">An advisor</span>
                <span className={`block text-sm ${filler === "advisor" ? "text-white/80" : "text-gray-500"}`}>
                  On behalf of a client
                </span>
              </button>
            </div>
          </fieldset>

          {filler && (
            <>
              <div>
                <label htmlFor="intake-name" className="label">
                  {isAdvisor ? "Client name" : "Your name"}
                </label>
                <input
                  id="intake-name"
                  type="text"
                  required
                  className="input"
                  placeholder={isAdvisor ? "Client's full name" : "Your full name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="intake-phone" className="label">
                  {isAdvisor ? "Client phone number" : "Phone number"}
                </label>
                <input
                  id="intake-phone"
                  type="tel"
                  required
                  className="input"
                  placeholder="(555) 555-5555"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="intake-email" className="label">
                  {isAdvisor ? "Client email" : "Email"}
                </label>
                <input
                  id="intake-email"
                  type="email"
                  required
                  className="input"
                  placeholder={isAdvisor ? "client@example.gov" : "you@example.gov"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="intake-description" className="label">
                  Short description <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="intake-description"
                  className="input min-h-[88px]"
                  maxLength={500}
                  placeholder={
                    isAdvisor
                      ? "Anything useful about this client — situation, goals, concerns…"
                      : "Anything you'd like us to know about your situation…"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <p className="text-sm font-semibold text-mulberry" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full">
            Start the calculator →
          </button>
          <p className="text-center text-xs text-gray-500">
            Your answers are stored only in your browser session.
          </p>
        </form>
      </div>
    </div>
  );
}
