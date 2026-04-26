"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

type ContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
};

const INITIAL_FORM: ContactPayload = {
  name: "",
  email: "",
  subject: "",
  message: "",
  website: "",
};

export default function AboutContactForm() {
  const [form, setForm] = useState<ContactPayload>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = (await response.json()) as { error?: string; success?: boolean };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "Failed to send your message.");
      }

      setForm(INITIAL_FORM);
      toast.success("Message sent successfully. We will get back to you soon.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send your message.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-16 rounded-2xl border border-borderDark bg-surface p-6 sm:p-8">
      <div className="mb-6">
        <p className="mb-2 inline-flex rounded-full border border-success/35 bg-success/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] text-success">
          Contact IMAT
        </p>
        <h2 className="text-2xl font-bold text-textDefault sm:text-3xl">Reach Out To The Team</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text2 sm:text-base">
          Send us partnership requests, media inquiries, or infrastructure-related concerns. Your message is captured directly in our operations sheet for automated follow-up.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-1">
          <label htmlFor="contact-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-text3">
            Full Name
          </label>
          <input
            id="contact-name"
            type="text"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
            minLength={2}
            maxLength={80}
            className="w-full rounded-xl border border-borderDark bg-bg px-3 py-2.5 text-sm text-textDefault outline-none transition-colors placeholder:text-text3 focus:border-primary"
            placeholder="Your name"
          />
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="contact-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-text3">
            Email Address
          </label>
          <input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
            maxLength={120}
            className="w-full rounded-xl border border-borderDark bg-bg px-3 py-2.5 text-sm text-textDefault outline-none transition-colors placeholder:text-text3 focus:border-primary"
            placeholder="name@example.com"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-text3">
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            value={form.subject}
            onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            required
            minLength={3}
            maxLength={120}
            className="w-full rounded-xl border border-borderDark bg-bg px-3 py-2.5 text-sm text-textDefault outline-none transition-colors placeholder:text-text3 focus:border-primary"
            placeholder="What would you like to discuss?"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-text3">
            Message
          </label>
          <textarea
            id="contact-message"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            required
            minLength={10}
            maxLength={2000}
            rows={6}
            className="w-full resize-y rounded-xl border border-borderDark bg-bg px-3 py-2.5 text-sm text-textDefault outline-none transition-colors placeholder:text-text3 focus:border-primary"
            placeholder="Share details about your request"
          />
        </div>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-website">Website</label>
          <input
            id="contact-website"
            type="text"
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
            autoComplete="off"
            tabIndex={-1}
          />
        </div>

        <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text3">By submitting, you agree to be contacted regarding your message.</p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </section>
  );
}
