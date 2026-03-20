import TripPost from './TripPost';
import type { FeedPost } from '../types/feed';
import type { TripDNAMatch } from '../services/matchApi';

type MainFeedProps = {
  mode?: 'main' | 'mine';
  posts: FeedPost[];
  sentRequestPostIds: string[];
  currentUserAuthorKey?: string;
  currentUserId?: string | null;
  currentUserIsVerified?: boolean;
  pendingRequestCountByPostId?: Record<string, number>;
  isPostActionInProgress: boolean;
  dnaMatchByPostId: Record<string, TripDNAMatch>;
  dnaMatchLoadingPostIds: string[];
  onJoinRequest: (post: FeedPost) => void;
  onOpenTripChat?: (tripId: string) => void;
  onManageRequests: (post: FeedPost) => void;
  onSharePost: (post: FeedPost) => void;
  onDismissPost: (postId: string) => void;
  onEditPost: (post: FeedPost) => void;
  onDeletePost: (post: FeedPost) => void;
  onCompletePost: (post: FeedPost) => void;
};

const normalizeName = (value: string): string => value.trim().toLowerCase();

function MainFeed({
  mode = 'main',
  posts,
  sentRequestPostIds,
  currentUserAuthorKey,
  currentUserId,
  currentUserIsVerified = false,
  pendingRequestCountByPostId = {},
  isPostActionInProgress,
  dnaMatchByPostId,
  dnaMatchLoadingPostIds,
  onJoinRequest,
  onOpenTripChat,
  onManageRequests,
  onSharePost,
  onDismissPost,
  onEditPost,
  onDeletePost,
  onCompletePost,
}: MainFeedProps) {
  const normalizedCurrentUserAuthorKey = currentUserAuthorKey ? normalizeName(currentUserAuthorKey) : null;
  const isMyFeedMode = mode === 'mine';
  const feedEyebrow = isMyFeedMode ? 'My Feed' : 'Main Feed';
  const feedTitle = isMyFeedMode ? 'My Posts' : 'Main Feed';
  const feedDescription = isMyFeedMode
    ? 'Only trip posts you created are shown here.'
    : 'LinkedIn-style trip updates from verified organizers and hosts.';
  const emptyTitle = isMyFeedMode ? 'No active posts in your feed yet' : 'No active trip posts right now';
  const emptyDescription = isMyFeedMode
    ? 'Create a trip post to publish your first host request.'
    : 'You dismissed all recommendations. Refresh later for new trips.';

  if (posts.length === 0) {
    return (
      <section className="rounded-card border border-primary/10 bg-white/90 p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{feedEyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-primary">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-primary/75">{emptyDescription}</p>
      </section>
    );
  }

  return (
    <section>
      <header className="mb-4 rounded-card border border-primary/10 bg-white/90 px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{feedEyebrow}</p>
        <h2 className="text-2xl font-black text-primary">{feedTitle}</h2>
        <p className="text-sm text-primary/75">{feedDescription}</p>
      </header>

      <div className="space-y-4">
        {posts.map((post) => {
          const canManagePostByAuthor =
            normalizedCurrentUserAuthorKey !== null && normalizeName(post.authorKey) === normalizedCurrentUserAuthorKey;
          const canManagePostById = Boolean(currentUserId && post.hostId && post.hostId === currentUserId);
          const canManagePost = canManagePostById || canManagePostByAuthor;

          return (
            <TripPost
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserAuthorKey={currentUserAuthorKey ?? null}
              currentUserIsVerified={currentUserIsVerified}
              canManagePost={canManagePost}
              pendingRequestCount={pendingRequestCountByPostId[post.id] ?? post.pendingRequestCount ?? 0}
              isRequestSent={sentRequestPostIds.includes(post.id)}
              isActionInProgress={isPostActionInProgress}
              dnaMatch={dnaMatchByPostId[post.id]}
              isDNAMatchLoading={dnaMatchLoadingPostIds.includes(post.id)}
              showDNACompatibility={!isMyFeedMode}
              onJoinRequest={onJoinRequest}
              onOpenTripChat={onOpenTripChat}
              onManageRequests={onManageRequests}
              onShare={onSharePost}
              onDismiss={onDismissPost}
              onEditPost={onEditPost}
              onDeletePost={onDeletePost}
              onCompletePost={onCompletePost}
            />
          );
        })}
      </div>
    </section>
  );
}

export default MainFeed;
