"use server";

import { z } from "zod";

import { db } from "@/db";
import { messages } from "@/db/schema";

const ContactSchema = z.object({
  name: z.string().trim().min(1, "Please add your name.").max(120),
  email: z.email("That email address does not look right.").max(255),
  body: z.string().trim().min(10, "Tell me a little more — 10 characters minimum.").max(5000),
  // Honeypot: real people leave this empty.
  company: z.string().max(0).optional().or(z.literal("")),
});

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<"name" | "email" | "body", string>>;
};

export async function sendMessage(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    body: formData.get("body"),
    company: formData.get("company") ?? "",
  });

  if (!parsed.success) {
    const flat = z.flattenError(parsed.error).fieldErrors;
    // A filled honeypot is a bot; give it the success path and drop the write.
    if (flat.company) return { status: "success", message: "Thanks — I'll be in touch." };
    return {
      status: "error",
      message: "Please check the fields below.",
      errors: {
        name: flat.name?.[0],
        email: flat.email?.[0],
        body: flat.body?.[0],
      },
    };
  }

  try {
    await db.insert(messages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      body: parsed.data.body,
    });
  } catch {
    return { status: "error", message: "Something went wrong sending that. Try again shortly." };
  }

  return { status: "success", message: "Thanks — I'll be in touch." };
}
