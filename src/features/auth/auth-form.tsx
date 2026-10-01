"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { registerAction } from "./actions";
import {
  createSignInSchema,
  createSignUpSchema,
  type SignUpInput,
} from "./schema";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/toast-provider";

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
  const notify = useToast();
  const { t, href, messages } = useI18n();
  const validationMessages = useMemo(
    () => ({
      passwordRequired: messages["auth.passwordRequired"],
      passwordLength: messages["auth.passwordLength"],
      usernameFormat: messages["auth.usernameFormat"],
      passwordMismatch: messages["auth.passwordMismatch"],
    }),
    [messages],
  );
  const signInSchema = useMemo(
    () => createSignInSchema(validationMessages),
    [validationMessages],
  );
  const signUpSchema = useMemo(
    () => createSignUpSchema(validationMessages),
    [validationMessages],
  );
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
        href(
          `/auth/sign-in?registered=1&callbackUrl=${encodeURIComponent(callbackUrl)}`,
        ),
      );
    } catch {
      setError(t("auth.genericError"));
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
        setError(t("auth.invalidCredentials"));
        return;
      }
      notify("auth.signedIn");
      router.replace(callbackUrl);
      router.refresh();
    } catch {
      setError(t("auth.genericError"));
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
            label: t("auth.displayName"),
            autocomplete: "name",
          },
          {
            name: "username" as const,
            label: t("auth.username"),
            autocomplete: "username",
          },
        ]
      : []),
    {
      name: "email",
      label: t("auth.email"),
      autocomplete: "email",
      type: "email",
    },
    {
      name: "password",
      label: t("auth.password"),
      autocomplete: isSignUp ? "new-password" : "current-password",
      type: "password",
    },
    ...(isSignUp
      ? [
          {
            name: "confirmation" as const,
            label: t("auth.confirmPassword"),
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
        {isSignUp ? t("auth.placeAtTable") : t("auth.welcome")}
      </h1>
      <p>
        {isSignUp ? t("auth.signUpDescription") : t("auth.signInDescription")}
      </p>
      <nav className="auth-tabs" aria-label={t("auth.access")}>
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
                href(
                  `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
                ),
              );
          }}
          href={href(
            `/auth/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          )}
          aria-current={!isSignUp ? "page" : undefined}
        >
          {t("common.signIn")}
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
                href(
                  `/auth/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`,
                ),
              );
          }}
          href={href(
            `/auth/sign-up?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          )}
          aria-current={isSignUp ? "page" : undefined}
        >
          {t("auth.createAccount")}
        </Link>
      </nav>
      {registered && !isSignUp && (
        <p className="auth-success" role="status">
          {t("auth.registered")}
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
                    aria-label={
                      visible ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                    aria-pressed={visible}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
              </div>
              {name === "password" && isSignUp && (
                <small id="password-hint">{t("auth.passwordHint")}</small>
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
            {pending
              ? t("auth.wait")
              : isSignUp
                ? t("auth.createAccount")
                : t("common.signIn")}
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
        {isSignUp ? t("auth.alreadyMember") : t("auth.newToCookly")}{" "}
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
                href(
                  `/auth/${isSignUp ? "sign-in" : "sign-up"}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
                ),
              );
          }}
          href={href(
            `/auth/${isSignUp ? "sign-in" : "sign-up"}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
          )}
        >
          {isSignUp ? t("common.signIn") : t("auth.createAccount")}
        </Link>
      </p>
    </section>
  );
}
