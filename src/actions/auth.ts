"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { login, logout } from "@/lib/auth";
import { rateLimit, requestIp } from "@/lib/rate-limit";

/** Sign-in attempts allowed per address in LOGIN_WINDOW_MS, right or wrong. */
const LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

const LoginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Enter your email address and password." };
  }

  // Counted before the password is checked, so guessing is slowed whether
  // or not the guesses are right.
  if (!rateLimit(`login:${requestIp(await headers())}`, LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)) {
    return { error: "Too many attempts. Wait 15 minutes and try again." };
  }

  const ok = await login(parsed.data.email, parsed.data.password);
  if (!ok) return { error: "Those credentials do not match." };

  // Only follow same-site paths, so `?next=` cannot become an open redirect.
  const target =
    parsed.data.next && parsed.data.next.startsWith("/admin") ? parsed.data.next : "/admin";
  redirect(target);
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}
