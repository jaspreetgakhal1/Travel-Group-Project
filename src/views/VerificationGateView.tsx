import React, { useState } from 'react';

type VerificationGateViewProps = {
  isVerified: boolean;
  onVerify: () => void;
};

const VerificationGateView: React.FC<VerificationGateViewProps> = ({ isVerified, onVerify }) => {
  const [documentName, setDocumentName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentName || isSubmitting || isVerified) {
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      onVerify();
    }, 1200);
  };

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pb-16 pt-8">
      <article className="rounded-card bg-white/95 p-8 shadow-lg ring-1 ring-primary/10 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Identity Gate</p>
        <h2 className="mt-1 text-3xl font-black text-primary">Verification</h2>
        <p className="mt-2 text-sm text-primary/80">
          Upload a travel document snapshot. Once verified, your profile receives the Verified Badge.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-primary">Document Upload (simulated)</span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setDocumentName(file?.name ?? '');
              }}
              className="interactive-input w-full rounded-card border border-primary/20 bg-background/80 px-4 py-2.5 text-sm text-primary outline-none"
            />
          </label>

          {documentName ? <p className="text-sm text-primary/75">Selected: {documentName}</p> : null}

          <button
            type="submit"
            disabled={!documentName || isSubmitting || isVerified}
            className="interactive-btn rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isVerified ? 'Verified' : isSubmitting ? 'Submitting...' : 'Submit Verification'}
          </button>
        </form>

        {isVerified ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-success/20 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-success/40">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-success text-xs text-white">V</span>
            Verified Badge Granted
          </div>
        ) : null}
      </article>
    </section>
  );
};

export default VerificationGateView;
