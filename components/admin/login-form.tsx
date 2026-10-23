"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/login/actions";

const initialState: LoginState = undefined;

const inputClasses =
  "mt-2 w-full rounded-lg border border-border bg-elevated px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-gold focus:ring-2 focus:ring-gold/30";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="username"
          placeholder="admin@swiperstore.local"
          aria-describedby={state?.error ? "login-error" : undefined}
          className={inputClasses}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          maxLength={200}
          autoComplete="current-password"
          aria-describedby={state?.error ? "login-error" : undefined}
          className={inputClasses}
        />
      </div>

      {state?.error ? (
        <p
          id="login-error"
          role="alert"
          className="rounded-lg border border-sold/40 bg-sold/10 px-4 py-3 text-sm text-red-200"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-gold px-4 py-3 text-sm font-bold text-background transition hover:bg-champagne focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}
