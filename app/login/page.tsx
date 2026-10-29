
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

type Mode = "login" | "register";
type Step = "details" | "code";

type ApiResult = {
  ok?: boolean;
  error?: string;
};

const tabs: { mode: Mode; label: string }[] = [
  { mode: "login", label: "ورود" },
  { mode: "register", label: "ثبت‌نام" },
];

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("details");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function selectMode(next: Mode) {
    if (loading) return;

    setMode(next);
    setStep("details");
    setCode("");
    setError("");
    setNotice("");
  }

  async function requestCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error("آدرس ایمیل را وارد کنید.");
      }

      if (mode === "register" && name.trim().length < 2) {
        throw new Error(
          "نام باید حداقل دو کاراکتر داشته باشد."
        );
      }

      const response = await fetch(
        "/api/user/request-code",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
            name: mode === "register" ? name.trim() : "",
            mode,
          }),
        }
      );

      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        throw new Error(
          result.error || "درخواست کد انجام نشد."
        );
      }

      setEmail(normalizedEmail);
      setCode("");
      setStep("code");

      setNotice(
        normalizedEmail === "demo@parabin.test"
          ? "در محیط توسعه، اگر ورود آزمایشی فعال باشد، کد تست را وارد کنید."
          : "کد تأیید درخواست شد. ایمیل و پوشه Spam را بررسی کنید."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "خطایی رخ داد."
      );
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading || !/^\d{6}$/.test(code)) return;

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        "/api/user/verify-code",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code,
          }),
        }
      );

      const result = (await response.json()) as ApiResult;

      if (!response.ok) {
        throw new Error(
          result.error || "تأیید کد ناموفق بود."
        );
      }

      const next = new URLSearchParams(
        window.location.search
      ).get("next");

      // Only allow safe, same-site post-login destinations.
      const safePollDestination = Boolean(
        next &&
        /^\/polls\?firm=[a-zA-Z0-9_-]{1,80}$/.test(next)
      );
      const destination =
        next === "/lottery" ||
        next === "/lottery?join=1" ||
        safePollDestination
          ? next!
          : "/account";

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "کد اشتباه یا منقضی شده است."
      );
    } finally {
      setLoading(false);
    }
  }

  function backToDetails() {
    if (loading) return;

    setStep("details");
    setCode("");
    setError("");
    setNotice("");
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-[78vh] items-center justify-center bg-background px-4 py-12 text-foreground"
    >
      <div className="w-full max-w-[470px]">
        <div className="overflow-hidden rounded-2xl border border-border-theme bg-surface shadow-xl">
          <div className="border-b border-border-theme bg-surface-secondary p-6 text-center sm:p-7">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {step === "code" ? (
                <KeyRound size={27} />
              ) : mode === "register" ? (
                <UserPlus size={27} />
              ) : (
                <Mail size={27} />
              )}
            </div>

            <h1 className="mt-5 text-2xl font-extrabold">
              {step === "code"
                ? "تأیید ایمیل"
                : mode === "register"
                  ? "ثبت‌نام در پراپ بین"
                  : "ورود به پراپ بین"}
            </h1>

            <p className="mt-3 break-words text-sm leading-7 text-muted">
              {step === "code"
                ? `کد تأیید مربوط به ${email} را وارد کنید.`
                : mode === "register"
                  ? "برای ساخت حساب، نام و ایمیل خود را وارد کنید."
                  : "برای ورود به حساب، ایمیل خود را وارد کنید."}
            </p>
          </div>

          <div className="p-5 sm:p-8">
            {step === "details" && (
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-secondary p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.mode}
                    type="button"
                    aria-pressed={mode === tab.mode}
                    onClick={() => selectMode(tab.mode)}
                    className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${
                      mode === tab.mode
                        ? "bg-surface text-primary shadow-sm"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mb-5 flex items-start gap-2 rounded-xl bg-success/10 p-3 text-xs leading-7 text-success"
              >
                <CheckCircle2
                  size={17}
                  className="mt-1 shrink-0"
                />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <p
                role="alert"
                className="mb-5 rounded-xl bg-danger/10 p-3 text-xs leading-7 text-danger"
              >
                {error}
              </p>
            )}

            {step === "details" ? (
              <form
                onSubmit={requestCode}
                className="space-y-5"
              >
                {mode === "register" && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">
                      نام نمایشی
                    </span>

                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      placeholder="نام شما"
                      className="h-12 w-full rounded-xl border border-border-theme bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    آدرس ایمیل
                  </span>

                  <input
                    type="email"
                    required
                    dir="ltr"
                    autoComplete="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="example@gmail.com"
                    className="h-12 w-full rounded-xl border border-border-theme bg-background px-4 text-left text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <ArrowLeft size={18} />
                  )}

                  {mode === "register"
                    ? "ثبت‌نام و دریافت کد"
                    : "دریافت کد ورود"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={verifyCode}
                className="space-y-5"
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">
                    کد تأیید شش‌رقمی
                  </span>

                  <input
                    type="text"
                    required
                    dir="ltr"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 6)
                      )
                    }
                    placeholder="000000"
                    className="h-14 w-full rounded-xl border border-border-theme bg-background px-4 text-center text-2xl font-bold tracking-[0.3em] text-foreground outline-none focus:border-primary"
                  />
                </label>

                <button
                  type="submit"
                  disabled={
                    loading || !/^\d{6}$/.test(code)
                  }
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading && (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  )}
                  تأیید و ورود
                </button>

                <button
                  type="button"
                  onClick={backToDetails}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-primary disabled:opacity-50"
                >
                  <ArrowRight size={17} />
                  تغییر ایمیل یا درخواست کد جدید
                </button>
              </form>
            )}

            <div className="mt-7 flex items-start gap-2 border-t border-border-theme pt-5 text-xs leading-7 text-muted">
              <ShieldCheck
                size={19}
                className="mt-1 shrink-0 text-primary"
              />

              <span>
                کد ورود ۱۰ دقیقه اعتبار دارد.
                آن را در اختیار دیگران نگذارید.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
