"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { registerAction } from "./actions";
import { signInSchema, signUpSchema, type SignUpInput } from "./schema";

const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

export function AuthForm({
  mode,
  callbackUrl,
  registered = false,
  onPendingChange,
}: {
  mode: "sign-in" | "sign-up";
  callbackUrl: string;
  registered?: boolean;
  onPendingChange?: (pending: boolean) => void;
}) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    hydratedSnapshot,
    serverSnapshot,
  );
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      displayName: "",
      username: "",
      email: "",
      password: "",
      confirmation: "",
    },
  });
  const login = useForm<{ email: string; password: string }>({
    resolver: zodResolver(signInSchema),
  });
  const pending = form.formState.isSubmitting || login.formState.isSubmitting;
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    mounted.current = true;
    const frame = requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
    return () => {
      mounted.current = false;
      cancelAnimationFrame(frame);
    };
  }, []);
  useEffect(() => {
    onPendingChange?.(pending);
  }, [pending, onPendingChange]);
  const submitRegistration = async (data: SignUpInput) => {
    setError("");
    try {
      const result = await registerAction(data);
      if (!mounted.current) return;
      if (!result.success) {
        setError(result.message);
        return;
      }
      window.history.replaceState(
        null,
        "",
        `/auth/sign-in?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`,
      );
    } catch {
      setError("Something went wrong. Please try again later.");
    }
  };
  const submitLogin = async (data: { email: string; password: string }) => {
    setError("");
    try {
      const result = await signIn("credentials", {
        ...data,
        redirect: false,
        callbackUrl,
      });
      if (!mounted.current) return;
      if (!result?.ok || result.error) {
        setError("Unable to sign in. Check your details or try again later.");
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError("Sign in is temporarily unavailable. Please try again later.");
    }
  };
  const fieldError = (name: keyof SignUpInput) =>
    isSignUp
      ? form.formState.errors[name]?.message
      : name === "email" || name === "password"
        ? login.formState.errors[name]?.message
        : undefined;
  const fields: {
    name: keyof SignUpInput;
    label: string;
    autocomplete: string;
    type?: string;
  }[] = [
    ...(isSignUp
      ? [
          {
            name: "displayName" as const,
            label: "Display name",
            autocomplete: "name",
          },
          {
            name: "username" as const,
            label: "Username",
            autocomplete: "username",
          },
        ]
      : []),
    {
      name: "email",
      label: "Email address",
      autocomplete: "email",
      type: "email",
    },
    {
      name: "password",
      label: "Password",
      autocomplete: isSignUp ? "new-password" : "current-password",
      type: "password",
    },
    ...(isSignUp
      ? [
          {
            name: "confirmation" as const,
            label: "Confirm password",
            autocomplete: "new-password",
            type: "password",
          },
        ]
      : []),
  ];
  return (
    <section
      className="auth-panel"
      data-mode={mode}
      aria-labelledby="auth-title"
    >
      <h1 id="auth-title" ref={heading} tabIndex={-1}>
        {isSignUp ? "A place at the table" : "Welcome to Cookly"}
      </h1>
      <p>
        {isSignUp
          ? "Start your own cooking story."
          : "Sign in to continue your culinary journey."}
      </p>
      <nav className="auth-tabs" aria-label="Account access">
        <Link
          replace
          scroll={false}
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
          onNavigate={(event) => {
            event.preventDefault();
            if (!pending)
              window.history.replaceState(
                null,
                "",
                `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
              );
          }}
          href={`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          aria-current={!isSignUp ? "page" : undefined}
        >
          Sign in
        </Link>
        <Link
          replace
          scroll={false}
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
          onNavigate={(event) => {
            event.preventDefault();
            if (!pending)
              window.history.replaceState(
                null,
                "",
                `/auth/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`,
              );
          }}
          href={`/auth/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          aria-current={isSignUp ? "page" : undefined}
        >
          Create account
        </Link>
      </nav>
      {registered && !isSignUp && (
        <p className="auth-success" role="status">
          Your account is ready. Sign in to get started.
        </p>
      )}
      <form
        method="post"
        onSubmit={(event) => {
          if (isSignUp) void form.handleSubmit(submitRegistration)(event);
          else void login.handleSubmit(submitLogin)(event);
        }}
        noValidate
        aria-busy={pending}
      >
        <fieldset disabled={pending || !hydrated}>
          {fields.map(({ name, label, autocomplete, type }) => (
            <div className="auth-field" data-field={name} key={name}>
              <label htmlFor={name}>{label}</label>
              <div className="auth-input-wrap">
                <input
                  required
                  id={name}
                  type={
                    type === "password" && visible ? "text" : (type ?? "text")
                  }
                  autoComplete={autocomplete}
                  maxLength={
                    name === "password" || name === "confirmation"
                      ? 128
                      : name === "username"
                        ? 30
                        : name === "displayName"
                          ? 80
                          : 254
                  }
                  aria-invalid={!!fieldError(name)}
                  aria-describedby={
                    fieldError(name)
                      ? `${name}-error`
                      : name === "password" && isSignUp
                        ? "password-hint"
                        : undefined
                  }
                  {...(isSignUp
                    ? form.register(name)
                    : login.register(name === "email" ? "email" : "password"))}
                />
                {name === "password" && (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label={visible ? "Hide password" : "Show password"}
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
              {name === "password" && isSignUp && (
                <small id="password-hint">
                  At least 8 characters. A memorable phrase works well.
                </small>
              )}
              {fieldError(name) && (
                <small id={`${name}-error`} className="auth-error">
                  {fieldError(name)}
                </small>
              )}
            </div>
          ))}
          <div aria-live="polite" aria-atomic="true">
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <button className="auth-submit" type="submit">
            {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </fieldset>
      </form>
      <noscript>
        <p className="auth-error">
          Please enable JavaScript to use secure account forms.
        </p>
      </noscript>
      <p className="auth-switch">
        {isSignUp ? "Already part of Cookly?" : "New to Cookly?"}{" "}
        <Link
          replace
          scroll={false}
          aria-disabled={pending}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
          onNavigate={(event) => {
            event.preventDefault();
            if (!pending)
              window.history.replaceState(
                null,
                "",
                `/auth/${isSignUp ? "sign-in" : "sign-up"}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
              );
          }}
          href={`/auth/${isSignUp ? "sign-in" : "sign-up"}?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </section>
  );
}
