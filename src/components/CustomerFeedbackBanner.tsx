import { useState } from 'react';
import { MessageSquareHeart, Star, ThumbsUp, X } from 'lucide-react';
import type { ClinicDoctor, CustomerFeedback } from '../types/clinic';

interface CustomerFeedbackBannerProps {
  feedbacks: CustomerFeedback[];
  helpfulCount: number;
  totalBotRatings: number;
  averageRating: number;
  doctors: ClinicDoctor[];
  onFeedbackAdded: (fb: CustomerFeedback) => void;
}

export function CustomerFeedbackBanner({
  feedbacks,
  helpfulCount,
  totalBotRatings,
  averageRating,
  doctors,
  onFeedbackAdded,
}: CustomerFeedbackBannerProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const helpfulPct =
    totalBotRatings > 0 ? Math.round((helpfulCount / totalBotRatings) * 100) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !comment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: patientName.trim(),
          doctorName: doctorName || undefined,
          rating,
          comment: comment.trim(),
        }),
      });
      if (!res.ok) {
        let msg = 'Could not save feedback.';
        try {
          const errData = (await res.json()) as { error?: string };
          if (errData?.error) msg = errData.error;
        } catch {
          // Ignore non-JSON error
        }
        throw new Error(msg);
      }
      const data = (await res.json()) as { feedback: CustomerFeedback };
      onFeedbackAdded(data.feedback);
      setPatientName('');
      setDoctorName('');
      setRating(5);
      setComment('');
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Patient feedback showcase"
      className="mb-5 rounded-2xl border border-[#CBE2EE] bg-gradient-to-r from-[#E8F6FB] via-[#F4FAFD] to-[#EBF4FF] p-4 shadow-sm sm:px-5 sm:py-4 dark:border-[#1E3347] dark:from-[#0F2433] dark:via-[#111E2B] dark:to-[#0F2033]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0E7490] text-white shadow-xs dark:bg-cyan-600">
            <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-slate-50">
                Patient Feedback Showcase
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums dark:text-slate-300">
                {averageRating > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900 dark:text-slate-100">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                    {averageRating} / 5 ({feedbacks.length})
                  </span>
                )}
                {helpfulPct !== null && (
                  <>
                    {averageRating > 0 && <span aria-hidden="true">·</span>}
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0E7490] dark:text-cyan-300">
                      <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                      {helpfulPct}% helpful chat replies ({helpfulCount}/{totalBotRatings})
                    </span>
                  </>
                )}
                {averageRating === 0 && helpfulPct === null && (
                  <span>Verified patient reviews & live reply ratings appear here</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#BDD8E7] bg-white px-3 py-1.5 text-xs font-semibold text-[#0E7490] transition-colors hover:border-[#0E7490] hover:bg-[#E6F4F9] whitespace-nowrap shrink-0 dark:border-[#243B52] dark:bg-[#152534] dark:text-cyan-300 dark:hover:border-cyan-400"
        >
          {formOpen ? (
            <>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Close</span>
            </>
          ) : (
            <>
              <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span>Share Feedback</span>
            </>
          )}
        </button>
      </div>

      {/* Inline Feedback Submission Form */}
      {formOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 grid grid-cols-1 gap-2.5 border-t border-[#CBE2EE] pt-3 sm:grid-cols-3 dark:border-[#1E3347]"
        >
          <input
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="min-h-[38px] rounded-lg border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
          />
          <select
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            aria-label="Doctor visited"
            className="min-h-[38px] rounded-lg border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
          >
            <option value="">General Clinic Experience</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            aria-label="Star rating"
            className="min-h-[38px] rounded-lg border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
          >
            <option value={5}>5 Stars — Excellent</option>
            <option value={4}>4 Stars — Very Good</option>
            <option value={3}>3 Stars — Good</option>
            <option value={2}>2 Stars — Fair</option>
            <option value={1}>1 Star — Needs Improvement</option>
          </select>
          <div className="flex gap-2 sm:col-span-3">
            <input
              type="text"
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your feedback about the clinic or dentist..."
              aria-label="Feedback comment"
              className="min-h-[38px] min-w-0 flex-1 rounded-lg border border-[#BDD8E7] bg-white px-3 text-base text-slate-900 sm:text-xs dark:border-[#243B52] dark:bg-[#0B141C] dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[38px] rounded-lg bg-[#0E7490] px-4 text-xs font-semibold text-white hover:bg-[#155E75] disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-cyan-600 dark:hover:bg-cyan-500"
            >
              {isSubmitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600 sm:col-span-3 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}

      {/* Showcased Patient Feedback Cards */}
      {feedbacks.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-[#CBE2EE] pt-3 sm:grid-cols-3 dark:border-[#1E3347]">
          {feedbacks.slice(0, 3).map((fb) => (
            <div
              key={fb.id}
              className="rounded-xl border border-[#D4E6F1] bg-white p-3 text-xs shadow-xs dark:border-[#1E3347] dark:bg-[#111E2B]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 truncate dark:text-slate-100">
                  {fb.patientName}
                </span>
                <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden="true" />
                  {fb.rating}.0
                </span>
              </div>
              <p className="mt-1 line-clamp-2 leading-relaxed text-slate-700 dark:text-slate-300">
                “{fb.comment}”
              </p>
              {fb.doctorName && (
                <p className="mt-1 text-[11px] font-medium text-[#0E7490] dark:text-cyan-300">
                  {fb.doctorName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
