"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type StateForm } from "../actions";

function TombolMasuk() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Memeriksa..." : "Masuk"}
    </button>
  );
}

export function FormLogin() {
  const [state, action] = useFormState<StateForm, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Email</span>
        <input name="email" type="email" autoComplete="username" required className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <TombolMasuk />
    </form>
  );
}
