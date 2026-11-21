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
        throw new Error('Could not save feedback.');
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
      className="mb-5 rounded-2xl border border-[#EFE2D3] bg-[#FFFDF9] p-4 shadow-sm sm:px-5 sm:py-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E5] text-[#C84635] dark:bg-orange-950/50 dark:text-orange-300">
            <MessageSquareHeart className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <h2 className="font-display text-sm font-bold text-stone-900 dark:text-[#FAF5EF]">
                Patient Feedback Showcase
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 tabular-nums dark:text-slate-400">
                {averageRating > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-stone-800 dark:text-slate-200">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
                    {averageRating} / 5 ({feedbacks.length})
                  </span>
                )}
                {helpfulPct !== null && (
                  <>
                    {averageRating > 0 && <span aria-hidden="true">·</span>}
                    <span className="inline-flex items-center gap-1 font-medium text-teal-800 dark:text-teal-300">
                      <ThumbsUp className="h-3 w-3" aria-hidden="true" />
                      {helpfulPct}% helpful chat replies ({helpfulCount}/{totalBotRatings})
                    </span>
                  </>
                )}
                {averageRating === 0 && helpfulPct === null && (
                  <span>Verified reviews & live reply ratings appear here</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-[#E7D8C5] bg-[#FFF9F2] px-3 py-1.5 text-xs font-semibold text-stone-800 transition-colors hover:border-[#C84635] hover:text-[#B23A2A] whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-orange-400"
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
          className="mt-3 grid grid-cols-1 gap-2.5 border-t border-[#F2E7DA] pt-3 sm:grid-cols-4 dark:border-slate-800"
        >
          <input
            type="text"
            required
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            className="min-h-[38px] rounded-lg border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <select
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
            aria-label="Doctor visited"
            className="min-h-[38px] rounded-lg border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
            className="min-h-[38px] rounded-lg border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value={5}>5 Stars — Excellent</option>
            <option value={4}>4 Stars — Very Good</option>
            <option value={3}>3 Stars — Good</option>
            <option value={2}>2 Stars — Fair</option>
            <option value={1}>1 Star — Needs Improvement</option>
          </select>
          <div className="flex gap-2 sm:col-span-4">
            <input
              type="text"
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your feedback about the clinic or dentist..."
              aria-label="Feedback comment"
              className="min-h-[38px] min-w-0 flex-1 rounded-lg border border-[#E7D8C5] bg-white px-3 text-base text-stone-900 sm:text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[38px] rounded-lg bg-teal-700 px-4 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-50 whitespace-nowrap shrink-0 dark:bg-teal-600"
            >
              {isSubmitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600 sm:col-span-4 dark:text-red-400">
              {error}
            </p>
          )}
        </form>
      )}

      {/* Showcased Patient Feedback Cards */}
      {feedbacks.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-[#F2E7DA] pt-3 sm:grid-cols-3 dark:border-slate-800">
          {feedbacks.slice(0, 3).map((fb) => (
            <div
              key={fb.id}
              className="rounded-xl border border-[#F0E4D6] bg-[#FFF9F2] p-3 text-xs dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-stone-900 truncate dark:text-slate-100">
                  {fb.patientName}
                </span>
                <span className="inline-flex items-center gap-0.5 font-semibold tabular-nums text-amber-600 dark:text-amber-400 shrink-0">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" aria-hidden="true" />
                  {fb.rating}.0
                </span>
              </div>
              <p className="mt-1 line-clamp-2 leading-relaxed text-stone-700 dark:text-slate-300">
                “{fb.comment}”
              </p>
              {fb.doctorName && (
                <p className="mt-1 text-[11px] font-medium text-teal-800 dark:text-teal-300">
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
