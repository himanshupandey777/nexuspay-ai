
import { useState } from 'react';
import toast from 'react-hot-toast';
import { processMilestone } from '../services/api';

// ==========================================
// CURRENCY OPTIONS
// ==========================================

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'ILS', name: 'Israeli New Shekel' },
  { code: 'ISK', name: 'Icelandic Krona' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'BRL', name: 'Brazilian Real' },
];

const MilestoneForm = ({ onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectScope: '',
    amount: '',
    currency: 'USD',
    githubUrl: '',
    freelancerEmail: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50';

  // ==========================================
  // PROCESS MILESTONE
  // ==========================================

  const handleSubmit = async (e, isOverride = false) => {
    e?.preventDefault();

    const amount = Number(formData.amount);

    if (
      !formData.title.trim() ||
      !formData.projectScope.trim() ||
      !formData.githubUrl.trim() ||
      !formData.freelancerEmail.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error('Please enter valid details in all required fields.');
      return;
    }

    if (isOverride) {
      if (!aiReview) {
        toast.error('No AI review is available to override.');
        return;
      }

      if (!overrideReason.trim()) {
        toast.error('Please provide a reason for overriding the AI decision.');
        return;
      }
    }

    setLoading(true);

    const toastId = toast.loading(
      isOverride
        ? 'Processing client override...'
        : 'AI is analyzing the GitHub pull request...'
    );

    try {
      const payload = {
        ...formData,
        amount,
        ...(isOverride
          ? {
              clientOverride: true,
              overrideReason: overrideReason.trim(),
            }
          : {}),
      };

      const response = await processMilestone(payload);

      toast.dismiss(toastId);

      // ==========================================
      // AI REJECTED THE MILESTONE
      // ==========================================

      if (!response?.success) {
        if (response?.verification) {
          setAiReview(response.verification);

          toast.error(
            'AI rejected the milestone. Review the report below.'
          );

          return;
        }

        toast.error(
          response?.message || 'Failed to process milestone'
        );

        return;
      }

      // ==========================================
      // SUCCESS
      // ==========================================

      const wasOverridden =
        response.summary?.clientOverride === true ||
        response.verification?.clientOverride === true;

      if (wasOverridden) {
        toast.success('Client override accepted. Payout submitted!');
      } else {
        const confidence = response.summary?.confidenceScore;

        toast.success(
          confidence != null
            ? `Verified! Confidence: ${confidence}%`
            : 'Milestone processed successfully!'
        );
      }

      onSuccess?.();

    } catch (error) {
      toast.dismiss(toastId);

      const errorData = error.response?.data;

      if (errorData?.verification) {
        setAiReview(errorData.verification);
      }

      toast.error(
        errorData?.message ||
        error.message ||
        'Server error. Please try again.'
      );

      console.error('Milestone processing failed:', error);

    } finally {
      setLoading(false);
    }
  };

  const confidence = aiReview
    ? Number(aiReview.confidenceScore)
    : 0;

  const confidenceLabel = Number.isFinite(confidence)
    ? `${Math.round(confidence)}%`
    : 'N/A';

  return (
    <div className="overflow-hidden rounded-2xl bg-white">

      {/* ====================================== */}
      {/* HEADER */}
      {/* ====================================== */}

      <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-5">

        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            New Milestone
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Submit work for AI verification
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-xl text-slate-400 transition-all hover:bg-white hover:text-slate-800 hover:shadow-sm disabled:opacity-40"
          aria-label="Close form"
        >
          ×
        </button>

      </div>

      {/* ====================================== */}
      {/* FORM */}
      {/* ====================================== */}

      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="space-y-5 p-6"
      >

        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Milestone Title
          </label>

          <input
            id="title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={inputClass}
            placeholder="Build JWT Authentication System"
            required
            disabled={loading}
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Short Description
            <span className="ml-1 font-normal text-slate-400">
              (Optional)
            </span>
          </label>

          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={2}
            className={`${inputClass} resize-y`}
            placeholder="Briefly describe this milestone..."
            disabled={loading}
          />
        </div>

        {/* Project Scope */}
        <div>
          <label
            htmlFor="projectScope"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Project Scope / Requirements
          </label>

          <textarea
            id="projectScope"
            name="projectScope"
            value={formData.projectScope}
            onChange={handleChange}
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="Describe exactly what the AI should verify..."
            required
            disabled={loading}
          />

          <p className="mt-1.5 text-xs text-slate-400">
            Specify the features and requirements the freelancer must complete.
          </p>
        </div>

        {/* ====================================== */}
        {/* PAYMENT AMOUNT AND CURRENCIES */}
        {/* ====================================== */}

        <div>
          <label
            htmlFor="amount"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Payment Amount
          </label>

          <input
            id="amount"
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            className={inputClass}
            placeholder="500.00"
            required
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* Payment Currency */}
          <div>
            <label
              htmlFor="currency"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Payment Currency
            </label>

            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className={inputClass}
              disabled={loading}
            >
              {currencies.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {item.name}
                </option>
              ))}
            </select>

            <p className="mt-1.5 text-xs text-slate-400">
              Currency in which the client sends the payment.
            </p>
          </div>

        </div>

        {/* GitHub URL */}
        <div>
          <label
            htmlFor="githubUrl"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            GitHub Pull Request URL
          </label>

          <input
            id="githubUrl"
            type="url"
            name="githubUrl"
            value={formData.githubUrl}
            onChange={handleChange}
            className={inputClass}
            placeholder="https://github.com/username/repo/pull/1"
            required
            disabled={loading}
          />
        </div>

        {/* Freelancer Email */}
        <div>
          <label
            htmlFor="freelancerEmail"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Freelancer PayPal Email
          </label>

          <input
            id="freelancerEmail"
            type="email"
            name="freelancerEmail"
            value={formData.freelancerEmail}
            onChange={handleChange}
            className={inputClass}
            placeholder="freelancer@example.com"
            required
            disabled={loading}
          />
        </div>

        {/* AI Information */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">
            AI-powered verification
          </p>

          <p className="mt-1 text-xs leading-relaxed text-indigo-700">
            NexusPay AI analyzes GitHub changes against your project scope before payment processing.
          </p>
        </div>

        {/* ====================================== */}
        {/* AI REVIEW REPORT */}
        {/* ====================================== */}

        {aiReview && (
          <div className="space-y-5 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">

            {/* Report Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    AI
                  </span>

                  <h3 className="text-lg font-bold text-slate-900">
                    AI Verification Report
                  </h3>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  Review the AI assessment before making your decision.
                </p>
              </div>

              <span className="w-fit rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-700">
                Rejected
              </span>

            </div>

            {/* Confidence Score */}
            <div className="rounded-xl bg-slate-50 p-4">

              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">
                  AI Confidence
                </span>

                <span className="text-xl font-extrabold text-indigo-700">
                  {confidenceLabel}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.max(0, confidence || 0))}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Confidence represents the AI's estimated certainty in its assessment, not a guarantee that the decision is correct.
              </p>

            </div>

            {/* Reasoning */}
            <div>
              <h4 className="mb-2 text-sm font-bold text-slate-800">
                AI Reasoning
              </h4>

              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                {aiReview.reasoning || 'No detailed reasoning was provided.'}
              </p>
            </div>

            {/* Strengths */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                  +
                </span>
                Strengths
              </h4>

              {Array.isArray(aiReview.strengths) &&
              aiReview.strengths.length > 0 ? (
                <ul className="space-y-2">
                  {aiReview.strengths.map((item, index) => (
                    <li
                      key={index}
                      className="flex gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                    >
                      <span className="font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No strengths reported.
                </p>
              )}
            </div>

            {/* Concerns */}
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-700">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100">
                  !
                </span>
                Concerns
              </h4>

              {Array.isArray(aiReview.concerns) &&
              aiReview.concerns.length > 0 ? (
                <ul className="space-y-2">
                  {aiReview.concerns.map((item, index) => (
                    <li
                      key={index}
                      className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
                    >
                      <span className="font-bold">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  No specific concerns reported.
                </p>
              )}
            </div>

            {/* Human Override */}
            <div className="border-t border-slate-200 pt-5">

              <div className="mb-3">
                <h4 className="text-base font-bold text-slate-900">
                  Client Decision
                </h4>

                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  You can review the AI findings and make the final decision. An override does not change the original AI assessment.
                </p>
              </div>

              <label
                htmlFor="overrideReason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Reason for overriding the AI decision
              </label>

              <textarea
                id="overrideReason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                className={`${inputClass} resize-y`}
                placeholder="Explain why you are approving this milestone despite the AI rejection..."
                disabled={loading}
              />

              <button
                type="button"
                onClick={() => handleSubmit(null, true)}
                disabled={loading || !overrideReason.trim()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-100 transition-all duration-200 hover:-translate-y-0.5 hover:from-amber-600 hover:to-orange-600 hover:shadow-xl active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Processing Override...
                  </>
                ) : (
                  'Override & Pay Anyway'
                )}
              </button>

              <p className="mt-2 text-center text-xs text-slate-500">
                This action will submit a payment request despite the AI rejection.
              </p>

            </div>
          </div>
        )}

        {/* ====================================== */}
        {/* ACTION BUTTONS */}
        {/* ====================================== */}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row">

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:from-indigo-700 hover:to-blue-700 hover:shadow-xl active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Processing...
              </>
            ) : (
              'Process Milestone'
            )}
          </button>

        </div>
      </form>
    </div>
  );
};

export default MilestoneForm;
