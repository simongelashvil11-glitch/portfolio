"use client";

import { ContactForm } from "@/components/contact-form";
import { MacWindow } from "@/components/mac-window";

/**
 * Contact, as a window rather than a section of the home page.
 *
 * It opens into the same `MacWindow` the videos and the portrait zoom use,
 * so it is the site's own window rather than a modal invented for one form —
 * and that component already owns the backdrop, the Escape key and the body
 * scroll lock, so none of that is reimplemented here.
 */
export function ContactWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <MacWindow open={open} title="Contact" onClose={onClose} widthClassName="max-w-xl">
      <div className="p-6 sm:p-8">
        <p className="mb-6 text-[0.9375rem] leading-relaxed text-muted">
          Have something in mind? Send a note and I&apos;ll reply within a couple of days.
        </p>

        <ContactForm />
      </div>
    </MacWindow>
  );
}
