// Added by Codex: project documentation comment for src\components\MainFeed.tsx
import { useEffect, useMemo, useState } from 'react';
import TripPost from './TripPost';
import type { FeedPost } from '../types/feed';
import type { TripDNAMatch } from '../services/matchApi';

type MainFeedProps = {
  mode?: 'main' | 'mine';
  posts: FeedPost[];
  isShowingHistoryFallback?: boolean;
  sentRequestPostIds: string[];
  currentUserAuthorKey?: string;
  currentUserId?: string | null;
  currentUserIsVerified?: boolean;
  pendingRequestCountByPostId?: Record<string, number>;
  joinConflictMessageByPostId?: Record<string, string>;
  activePostIds?: Set<string>;
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
  onCancelPost: (post: FeedPost) => void;
  onCreateNewTrip?: () => void;
};

const normalizeName = (value: string): string => value.trim().toLowerCase();
const getPostAuthorId = (post: FeedPost): string | null =>
  typeof post.author === 'object' && post.author !== null && typeof post.author.id === 'string' && post.author.id.trim()
    ? post.author.id
    : null;

const isOwnedPostForViewer = (
  post: FeedPost,
  currentUserId: string | null | undefined,
  normalizedCurrentUserAuthorKey: string | null,
): boolean => {
  const postAuthorId = getPostAuthorId(post);
  const isOwnPostByHostId = Boolean(currentUserId && post.hostId && post.hostId === currentUserId);
  const isOwnPostByAuthorId = Boolean(currentUserId && postAuthorId && postAuthorId === currentUserId);

  if (isOwnPostByHostId || isOwnPostByAuthorId) {
    return true;
  }

  if (currentUserId) {
    return false;
  }

  return normalizedCurrentUserAuthorKey !== null && normalizeName(post.authorKey) === normalizedCurrentUserAuthorKey;
};
const getViewerTripRole = (
  post: FeedPost,
  currentUserId: string | null | undefined,
  normalizedCurrentUserAuthorKey: string | null,
): 'host' | 'member' | null => {
  if (post.viewerRelationship === 'host' || post.viewerRelationship === 'member') {
    return post.viewerRelationship;
  }

  if (isOwnedPostForViewer(post, currentUserId, normalizedCurrentUserAuthorKey)) {
    return 'host';
  }

  return Boolean(currentUserId && post.participantIds.includes(currentUserId)) ? 'member' : null;
};

type FeedSortOption = 'nearest' | 'latest-start' | 'alphabetical';
type FeedFilterOption = 'all' | 'upcoming' | 'completed';

const getDayStartTimestamp = (value: string | Date): number | null => {
  const parsedDate = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate.getTime();
};

const getDayEndTimestamp = (value: string | Date): number | null => {
  const parsedDate = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(23, 59, 59, 999);
  return parsedDate.getTime();
};

const isTripActiveToday = (post: FeedPost, todayStart: number, todayEnd: number): boolean => {
  const tripStart = getDayStartTimestamp(post.startDate);
  const tripEnd = getDayEndTimestamp(post.endDate);

  if (tripStart === null || tripEnd === null) {
    return false;
  }

  return tripStart <= todayEnd && tripEnd >= todayStart;
};

const isTripUpcoming = (post: FeedPost, todayEnd: number): boolean => {
  const tripStart = getDayStartTimestamp(post.startDate);
  return tripStart !== null && tripStart > todayEnd && post.status !== 'Cancelled';
};

const isTripPastOrCompleted = (post: FeedPost, todayStart: number): boolean => {
  if (post.status === 'Completed') {
    return true;
  }

  const tripEnd = getDayEndTimestamp(post.endDate);
  return tripEnd !== null && tripEnd < todayStart;
};

function MainFeed({
  mode = 'main',
  posts,
  isShowingHistoryFallback = false,
  sentRequestPostIds,
  currentUserAuthorKey,
  currentUserId,
  currentUserIsVerified = false,
  pendingRequestCountByPostId = {},
  joinConflictMessageByPostId = {},
  activePostIds = new Set<string>(),
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
  onCancelPost,
  onCreateNewTrip,
}: MainFeedProps) {
  const [sortOption, setSortOption] = useState<FeedSortOption>('nearest');
  const [filterOption, setFilterOption] = useState<FeedFilterOption>('all');
  const normalizedCurrentUserAuthorKey = currentUserAuthorKey ? normalizeName(currentUserAuthorKey) : null;
  const isMyFeedMode = mode === 'mine';
  const todayStart = useMemo(() => getDayStartTimestamp(new Date()) ?? Date.now(), []);
  const todayEnd = useMemo(() => getDayEndTimestamp(new Date()) ?? Date.now(), []);
  const feedEyebrow = isMyFeedMode ? 'My Feed' : 'Main Feed';
  const feedTitle = isMyFeedMode ? 'My Posts' : 'Main Feed';
  const feedDescription = isShowingHistoryFallback
    ? isMyFeedMode
      ? 'Showing your latest trip records because there are no currently active hosted trips.'
      : 'Showing recent trip records because there are no currently active group trips right now.'
    : isMyFeedMode
      ? 'Only trip posts you created are shown here.'
      : 'Posts from other travelers appear here.';
  const emptyTitle = isMyFeedMode ? 'No upcoming trips' : 'No trips in your feed right now';
  const emptyDescription = isMyFeedMode
    ? 'Your upcoming hosted trips will appear here once they are scheduled.'
    : 'Trips you host or join will appear here once they are active or upcoming.';

  useEffect(() => {
    setSortOption('nearest');
    setFilterOption('all');
  }, [mode]);

  const filteredAndSortedPosts = useMemo(() => {
    const basePosts = posts.filter((post) => {
      if (filterOption === 'upcoming') {
        return isTripUpcoming(post, todayEnd);
      }

      if (filterOption === 'completed') {
        return isTripPastOrCompleted(post, todayStart);
      }

      return true;
    });

    return [...basePosts].sort((leftPost, rightPost) => {
      if (sortOption === 'alphabetical') {
        return leftPost.title.localeCompare(rightPost.title);
      }

      const leftIsActiveToday = isTripActiveToday(leftPost, todayStart, todayEnd);
      const rightIsActiveToday = isTripActiveToday(rightPost, todayStart, todayEnd);

      if (leftIsActiveToday !== rightIsActiveToday) {
        return leftIsActiveToday ? -1 : 1;
      }

      const leftStart = getDayStartTimestamp(leftPost.startDate);
      const rightStart = getDayStartTimestamp(rightPost.startDate);
      const leftEnd = getDayEndTimestamp(leftPost.endDate);
      const rightEnd = getDayEndTimestamp(rightPost.endDate);
      const leftIsPast = leftEnd !== null && leftEnd < todayStart;
      const rightIsPast = rightEnd !== null && rightEnd < todayStart;

      if (leftIsPast !== rightIsPast) {
        return leftIsPast ? 1 : -1;
      }

      if (sortOption === 'latest-start') {
        return (rightStart ?? 0) - (leftStart ?? 0);
      }

      const leftDistance = leftIsPast ? Number.MAX_SAFE_INTEGER - (leftEnd ?? 0) : Math.abs((leftStart ?? todayStart) - todayStart);
      const rightDistance =
        rightIsPast ? Number.MAX_SAFE_INTEGER - (rightEnd ?? 0) : Math.abs((rightStart ?? todayStart) - todayStart);

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return (leftStart ?? 0) - (rightStart ?? 0);
    });
  }, [filterOption, posts, sortOption, todayEnd, todayStart]);

  const activeFilterLabel =
    filterOption === 'upcoming'
      ? 'Upcoming'
      : filterOption === 'completed'
        ? 'Completed'
        : 'All Posts';

  if (filteredAndSortedPosts.length === 0) {
    return (
      <section className="rounded-card border border-primary/10 bg-white/90 p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{feedEyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-primary">{emptyTitle}</h2>
        <p className="mt-2 text-sm text-primary/75">{emptyDescription}</p>
        {isMyFeedMode && onCreateNewTrip ? (
          <button
            type="button"
            onClick={onCreateNewTrip}
            className="interactive-btn mt-5 rounded-card bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Create New Trip
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <header className="mb-4 rounded-card border border-primary/10 bg-white/90 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{feedEyebrow}</p>
            <h2 className="text-2xl font-black text-primary">{feedTitle}</h2>
            <p className="text-sm text-primary/75">{feedDescription}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {isMyFeedMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setFilterOption('all')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filterOption === 'all' ? 'bg-primary text-white' : 'bg-primary/8 text-primary hover:bg-primary/12'
                    }`}
                  >
                    All Posts
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOption('upcoming')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filterOption === 'upcoming' ? 'bg-primary text-white' : 'bg-primary/8 text-primary hover:bg-primary/12'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOption('completed')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filterOption === 'completed' ? 'bg-primary text-white' : 'bg-primary/8 text-primary hover:bg-primary/12'
                    }`}
                  >
                    Completed
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setFilterOption('all')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filterOption === 'all' ? 'bg-primary text-white' : 'bg-primary/8 text-primary hover:bg-primary/12'
                    }`}
                  >
                    All Posts
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOption('upcoming')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filterOption === 'upcoming' ? 'bg-primary text-white' : 'bg-primary/8 text-primary hover:bg-primary/12'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterOption('completed')}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filterOption === 'completed' ? 'bg-primary text-white' : 'bg-primary/8 text-primary hover:bg-primary/12'
                    }`}
                  >
                    Completed
                  </button>
                </>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary/60">
              Sort
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as FeedSortOption)}
                className="rounded-full border border-primary/12 bg-white px-3 py-2 text-xs font-semibold normal-case tracking-normal text-primary outline-none ring-0"
              >
                <option value="nearest">Nearest to Today</option>
                <option value="latest-start">Latest Start Date</option>
                <option value="alphabetical">Title A-Z</option>
              </select>
            </label>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-primary/65">
          <span className="rounded-full bg-primary/8 px-3 py-1">{activeFilterLabel}</span>
          <span>{filteredAndSortedPosts.length} posts</span>
        </div>
      </header>

      <div className="space-y-4">
        {filteredAndSortedPosts.map((post) => {
          const viewerTripRole = isMyFeedMode ? 'host' : getViewerTripRole(post, currentUserId, normalizedCurrentUserAuthorKey);
          const canManagePost = isMyFeedMode || viewerTripRole === 'host';

          return (
            <TripPost
              key={post.id}
              post={post}
              viewerTripRole={viewerTripRole ?? undefined}
              currentUserId={currentUserId}
              currentUserAuthorKey={currentUserAuthorKey ?? null}
              currentUserIsVerified={currentUserIsVerified}
              canManagePost={canManagePost}
              pendingRequestCount={pendingRequestCountByPostId[post.id] ?? post.pendingRequestCount ?? 0}
              joinConflictMessage={joinConflictMessageByPostId[post.id] ?? null}
              isCurrentActiveTrip={activePostIds.has(post.id)}
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
              onCancelPost={onCancelPost}
            />
          );
        })}
      </div>
    </section>
  );
}

export default MainFeed;

