"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "@/lib/firebase/config";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [submissionError, setSubmissionError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSubmissionError("");
    const fields = new FormData(e.currentTarget);
    const firstName = String(fields.get("firstName") ?? "").trim();
    const lastName = String(fields.get("lastName") ?? "").trim();
    const company = String(fields.get("company") ?? "").trim();
    const submitTicket = httpsCallable<{ name: string; company: string; email: string; subject: string; category: string; message: string }, { ticketId: string }>(getFunctions(app, "us-central1"), "submitSupportTicket");
    try {
      const response = await submitTicket({
        name: `${firstName} ${lastName}`.trim(),
        company,
        email: String(fields.get("email") ?? "").trim(),
        subject: String(fields.get("subject") ?? "").trim(),
        category: String(fields.get("category") ?? "other"),
        message: String(fields.get("message") ?? "").trim(),
      });
      setTicketId(response.data.ticketId);
      setSubmitted(true);
    } catch (error) {
      setSubmissionError(error && typeof error === "object" && "code" in error && error.code === "functions/resource-exhausted"
        ? "We received several requests from this address recently. Please email support@epcx.cloud if you still need help."
        : "We couldn’t send your request. Please try again, or email support@epcx.cloud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contact-page">
      <div className="contact-page-grid" aria-hidden="true" />
      <div className="contact-page-inner">
        <motion.header className="contact-page-intro" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <p className="contact-page-eyebrow"><span /> EPCX / CONTACT</p>
          <h1>Let&apos;s talk about <em>your field workflow.</em></h1>
          <p>Book a product conversation or tell us where your team needs support. We typically reply within one business day.</p>
        </motion.header>

        <div className="contact-page-layout">
          <aside className="contact-page-aside">
            <p className="contact-page-section-label">GET IN TOUCH</p>
            <h2>Talk to the EPCX team</h2>
            <p className="contact-page-aside-copy">We can help with product demonstrations, account access, billing and technical questions.</p>
            <div className="contact-page-details">
              <a href="mailto:support@epcx.cloud" className="contact-page-detail"><span><Mail size={18} /></span><div><small>EMAIL</small><b>support@epcx.cloud</b><i>We typically reply within one business day.</i></div></a>
              <div className="contact-page-detail"><span><Phone size={18} /></span><div><small>PHONE</small><b>Available upon request</b><i>Send a note and we can arrange a call.</i></div></div>
              <div className="contact-page-detail"><span><MapPin size={18} /></span><div><small>SUPPORTING</small><b>Engineering teams worldwide</b><i>Built around real EPC field workflows.</i></div></div>
            </div>
            <div className="contact-page-response"><span className="contact-page-response-dot" /><p><b>Need a product walkthrough?</b><br />Choose “Product or demo” in the form and tell us what your team is working on.</p></div>
          </aside>

          <motion.div className="contact-page-form-wrap" initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            {submitted ? (
              <div className="contact-page-success" role="status"><span><Send size={20} /></span><p className="contact-page-section-label">REQUEST RECEIVED</p><h2>Thanks for getting in touch.</h2><p>Your support reference is <b>{ticketId}</b>. Our team will reply to the email address you provided.</p></div>
            ) : (
              <form onSubmit={handleSubmit} className="contact-page-form">
                <div className="contact-page-form-heading"><div><p className="contact-page-section-label">SEND A MESSAGE</p><h2>How can we help?</h2></div><span>Fields marked * are required</span></div>
                <div className="contact-page-form-grid">
                  <label>First name *<input name="firstName" type="text" required autoComplete="given-name" placeholder="Your first name" /></label>
                  <label>Last name *<input name="lastName" type="text" required autoComplete="family-name" placeholder="Your last name" /></label>
                  <label>Work email *<input name="email" type="email" required autoComplete="email" placeholder="you@company.com" /></label>
                  <label>Company *<input name="company" type="text" required autoComplete="organization" placeholder="Your engineering company" /></label>
                  <label>Subject *<input name="subject" type="text" required minLength={4} maxLength={160} placeholder="A short summary" /></label>
                  <label>Request type<select name="category" defaultValue="other"><option value="account">Account access</option><option value="billing">Billing or plan</option><option value="technical">Technical issue</option><option value="sales">Product or demo</option><option value="other">Other</option></select></label>
                  <label className="contact-page-message-field">Message *<textarea name="message" rows={5} required minLength={15} maxLength={8000} placeholder="Tell us about your team and what you would like help with." /></label>
                </div>
                {submissionError && <p role="alert" className="contact-page-error">{submissionError}</p>}
                <button type="submit" disabled={loading} className="contact-page-submit">{loading ? "Sending request…" : "Send message"}{!loading && <Send size={16} />}</button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
