"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { login, logout } from "@/lib/auth";

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
