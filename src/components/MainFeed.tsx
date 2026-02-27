import TripPost from './TripPost';
import type { FeedPost } from '../types/feed';
import type { TripDNAMatch } from '../services/matchApi';

type MainFeedProps = {
  posts: FeedPost[];
  sentRequestPostIds: string[];
  currentUserAuthorKey?: string;
  isPostActionInProgress: boolean;
  dnaMatchByPostId: Record<string, TripDNAMatch>;
  dnaMatchLoadingPostIds: string[];
  onJoinRequest: (post: FeedPost) => void;
  onSharePost: (post: FeedPost) => void;
  onDismissPost: (postId: string) => void;
  onEditPost: (post: FeedPost) => void;
  onDeletePost: (post: FeedPost) => void;
  onCompletePost: (post: FeedPost) => void;
};

const normalizeName = (value: string): string => value.trim().toLowerCase();

function MainFeed({
  posts,
  sentRequestPostIds,
  currentUserAuthorKey,
  isPostActionInProgress,
  dnaMatchByPostId,
  dnaMatchLoadingPostIds,
  onJoinRequest,
  onSharePost,
  onDismissPost,
  onEditPost,
  onDeletePost,
  onCompletePost,
}: MainFeedProps) {
  const normalizedCurrentUserAuthorKey = currentUserAuthorKey ? normalizeName(currentUserAuthorKey) : null;

  if (posts.length === 0) {
    return (
      <section className="rounded-card border border-primary/10 bg-white/90 p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Main Feed</p>
        <h2 className="mt-2 text-2xl font-black text-primary">No active trip posts right now</h2>
        <p className="mt-2 text-sm text-primary/75">You dismissed all recommendations. Refresh later for new trips.</p>
      </section>
    );
  }

  return (
    <section>
      <header className="mb-4 rounded-card border border-primary/10 bg-white/90 px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">Social Feed</p>
        <h2 className="text-2xl font-black text-primary">MainFeed</h2>
        <p className="text-sm text-primary/75">LinkedIn-style trip updates from verified organizers and hosts.</p>
      </header>

      <div className="space-y-4">
        {posts.map((post) => {
          const canManagePost =
            normalizedCurrentUserAuthorKey !== null && normalizeName(post.authorKey) === normalizedCurrentUserAuthorKey;

          return (
            <TripPost
              key={post.id}
              post={post}
              canManagePost={canManagePost}
              isRequestSent={sentRequestPostIds.includes(post.id)}
              isActionInProgress={isPostActionInProgress}
              dnaMatch={dnaMatchByPostId[post.id]}
              isDNAMatchLoading={dnaMatchLoadingPostIds.includes(post.id)}
              onJoinRequest={onJoinRequest}
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
