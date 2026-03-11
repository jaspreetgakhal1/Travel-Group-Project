import type { HostTripRequest } from '../services/tripRequestApi';

type RequestModalProps = {
  isOpen: boolean;
  tripTitle: string;
  requests: HostTripRequest[];
  isLoading: boolean;
  isActionInProgress: boolean;
  onClose: () => void;
  onAccept: (request: HostTripRequest) => void;
  onReject: (request: HostTripRequest) => void;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function RequestModal({
  isOpen,
  tripTitle,
  requests,
  isLoading,
  isActionInProgress,
  onClose,
  onAccept,
  onReject,
}: RequestModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-[#3D405B]/45 backdrop-blur-[2px]"
        aria-label="Close request modal"
      />

      <div className="relative mx-auto mt-16 w-[min(94vw,720px)] rounded-3xl border border-primary/15 bg-[#F4F1DE] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-primary/10 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">Manage Requests</p>
            <h3 className="mt-1 text-xl font-black text-primary">{tripTitle}</h3>
            <p className="mt-1 text-sm text-primary/75">Review pending travelers and approve your preferred matches.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="interactive-btn rounded-card border border-primary/20 bg-white/70 px-3 py-1.5 text-xs font-semibold text-primary"
          >
            Close
          </button>
        </div>

        <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {isLoading ? (
            <p className="rounded-card bg-white/70 px-4 py-3 text-sm font-semibold text-primary">Loading requests...</p>
          ) : requests.length === 0 ? (
            <p className="rounded-card bg-white/70 px-4 py-3 text-sm text-primary/80">No pending requests right now.</p>
          ) : (
            requests.map((requestItem) => (
              <article
                key={requestItem.id}
                className="rounded-2xl border border-primary/10 bg-white/80 px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-primary">{requestItem.requesterLabel}</p>
                    <p className="text-xs text-primary/70">
                      Requested on {dateFormatter.format(new Date(requestItem.createdAt))}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {requestItem.status.toUpperCase()}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isActionInProgress || requestItem.status !== 'pending'}
                    onClick={() => onAccept(requestItem)}
                    className="interactive-btn rounded-card bg-success px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={isActionInProgress || requestItem.status !== 'pending'}
                    onClick={() => onReject(requestItem)}
                    className="interactive-btn rounded-card border border-[#E07A5F]/35 bg-[#E07A5F]/15 px-3 py-1.5 text-xs font-semibold text-[#8C4633] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RequestModal;

