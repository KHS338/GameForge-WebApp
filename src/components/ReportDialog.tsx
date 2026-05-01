import { type FormEvent, useEffect, useState } from 'react';

const defaultReasons = [
  'Spam or scam',
  'Harassment or abuse',
  'Hate speech',
  'Adult or explicit content',
  'Misinformation',
  'Off-topic',
  'Other',
];

interface ReportDialogProps {
  isOpen: boolean;
  targetType: 'topic' | 'comment';
  targetLabel: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; details: string }) => Promise<void> | void;
}

export function ReportDialog({
  isOpen,
  targetType,
  targetLabel,
  isSubmitting,
  onClose,
  onSubmit,
}: ReportDialogProps) {
  const [reason, setReason] = useState(defaultReasons[0]);
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setReason(defaultReasons[0]);
    setDetails('');
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return;
    }

    await onSubmit({
      reason: trimmedReason,
      details: details.trim(),
    });
  }

  return (
    <div className="report-dialog-overlay" role="presentation" onClick={onClose}>
      <article className="report-dialog" role="dialog" aria-modal="true" aria-label="Report content" onClick={(event) => event.stopPropagation()}>
        <header className="report-dialog-header">
          <h3>Report {targetType}</h3>
          <button type="button" className="icon-button" onClick={onClose} disabled={isSubmitting} aria-label="Close report dialog">
            ×
          </button>
        </header>

        <p className="report-dialog-target">{targetLabel}</p>

        <form className="report-dialog-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>Reason</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)} disabled={isSubmitting}>
              {defaultReasons.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Details (optional)</span>
            <textarea
              rows={4}
              value={details}
              placeholder="Add more context to help moderators review this faster..."
              onChange={(event) => setDetails(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <div className="report-dialog-actions">
            <button type="button" className="cta ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="cta primary" disabled={isSubmitting || !reason.trim()}>
              {isSubmitting ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </form>
      </article>
    </div>
  );
}
