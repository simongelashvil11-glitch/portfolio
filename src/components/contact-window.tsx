"use client";

import { ContactForm } from "@/components/contact-form";
import { Dialog } from "@/components/dialog";

/** Asks the sidebar, which owns the dialog's state, to open it. */
export const OPEN_CONTACT = "portfolio:open-contact";

/**
 * Contact, as a dialog rather than a section of the home page.
 *
 * It opens into the same `Dialog` the videos and the image viewer use, which
 * already owns the overlay, the Escape key and the body scroll lock.
 */
export function ContactWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} title="Get in touch" onClose={onClose} widthClassName="max-w-lg">
      <p className="mb-5 text-sm text-muted">
        Have something in mind? Send a note and I&apos;ll reply within a couple of days.
      </p>

      <ContactForm />
    </Dialog>
  );
}

/** A button anywhere on the page that opens the contact dialog. */
export function ContactButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONTACT))} className={className}>
      {children}
    </button>
  );
}
