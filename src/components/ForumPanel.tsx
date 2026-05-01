import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Flag, Lock, MessageSquare, Pin, ThumbsDown, ThumbsUp } from 'lucide-react';
import { forumsApi, type ApiForumComment, type ApiForumTopic } from '../api';

type TopicSort = 'activity' | 'latest' | 'top';
type CommentSort = 'oldest' | 'latest' | 'top';

interface ForumPanelProps {
  gameId: string;
}

function markdownToSafeHtml(markdown: string) {
  const html = marked.parse(markdown, { breaks: true, gfm: true });
  return DOMPurify.sanitize(typeof html === 'string' ? html : String(html));
}

function toDate(value: string) {
  return new Date(value).toLocaleString();
}

export function ForumPanel({ gameId }: ForumPanelProps) {
  const [topics, setTopics] = useState<ApiForumTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topicSort, setTopicSort] = useState<TopicSort>('activity');
  const [topicSearch, setTopicSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ApiForumTopic | null>(null);
  const [comments, setComments] = useState<ApiForumComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSort, setCommentSort] = useState<CommentSort>('oldest');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicBody, setTopicBody] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});

  const childrenByParent = useMemo(() => {
    const grouped = new Map<string, ApiForumComment[]>();
    comments.forEach((comment) => {
      const parentKey = comment.parentCommentId ? String(comment.parentCommentId) : 'ROOT';
      const current = grouped.get(parentKey) ?? [];
      current.push(comment);
      grouped.set(parentKey, current);
    });
    return grouped;
  }, [comments]);

  const isTopicLockedForUser = Boolean(selectedTopic?.locked && !selectedTopic?.canModerate);

  function patchTopicInState(nextTopic: ApiForumTopic) {
    setTopics((current) => current.map((topic) => (topic._id === nextTopic._id ? nextTopic : topic)));
    if (selectedTopic?._id === nextTopic._id) {
      setSelectedTopic(nextTopic);
    }
  }

  async function loadTopics() {
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const data = await forumsApi.getTopics(gameId, {
        sort: topicSort,
        q: topicSearch.trim() || undefined,
      });
      setTopics(data.items);

      if (data.items.length === 0) {
        setSelectedTopicId(null);
        setSelectedTopic(null);
      } else if (!selectedTopicId || !data.items.some((item) => item._id === selectedTopicId)) {
        setSelectedTopicId(data.items[0]._id);
      }
    } catch (error) {
      setTopicsError(error instanceof Error ? error.message : 'Could not load topics');
    } finally {
      setTopicsLoading(false);
    }
  }

  async function loadTopicAndComments(topicId: string) {
    setCommentsLoading(true);
    try {
      const [topic, commentsData] = await Promise.all([
        forumsApi.getTopic(topicId),
        forumsApi.getComments(topicId, { sort: commentSort }),
      ]);
      setSelectedTopic(topic);
      setComments(commentsData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load thread');
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    setSelectedTopicId(null);
    setSelectedTopic(null);
    setComments([]);
    setReplyDrafts({});
    setReplyOpen({});
    void loadTopics();
  }, [gameId, topicSort]);

  useEffect(() => {
    if (!selectedTopicId) {
      return;
    }
    void loadTopicAndComments(selectedTopicId);
  }, [selectedTopicId, commentSort]);

  async function handleCreateTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!topicTitle.trim() || !topicBody.trim()) {
      setMessage('Topic title and content are required.');
      return;
    }

    try {
      const created = await forumsApi.createTopic(gameId, {
        title: topicTitle.trim(),
        bodyMarkdown: topicBody,
      });
      setTopicTitle('');
      setTopicBody('');
      setTopics((current) => [created, ...current]);
      setSelectedTopicId(created._id);
      setMessage('Topic created.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create topic');
    }
  }

  async function handleTopicVote(topicId: string, currentVote: -1 | 0 | 1, targetVote: -1 | 1) {
    try {
      const vote = currentVote === targetVote ? 0 : targetVote;
      const nextTopic = await forumsApi.voteTopic(topicId, vote);
      patchTopicInState(nextTopic);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not vote topic');
    }
  }

  async function handleCommentVote(commentId: string, currentVote: -1 | 0 | 1, targetVote: -1 | 1) {
    try {
      const vote = currentVote === targetVote ? 0 : targetVote;
      const updated = await forumsApi.voteComment(commentId, vote);
      setComments((current) => current.map((comment) => (comment._id === updated._id ? updated : comment)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not vote comment');
    }
  }

  async function handleCreateComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTopic || !commentBody.trim()) {
      return;
    }

    try {
      const created = await forumsApi.createComment(selectedTopic._id, {
        bodyMarkdown: commentBody,
      });
      setCommentBody('');
      setComments((current) => [...current, created]);
      const refreshed = await forumsApi.getTopic(selectedTopic._id);
      patchTopicInState(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add comment');
    }
  }

  async function handleCreateReply(commentId: string) {
    const draft = (replyDrafts[commentId] ?? '').trim();
    if (!selectedTopic || !draft) {
      return;
    }

    try {
      const created = await forumsApi.createReply(commentId, {
        bodyMarkdown: draft,
      });
      setComments((current) => [...current, created]);
      setReplyDrafts((current) => ({ ...current, [commentId]: '' }));
      setReplyOpen((current) => ({ ...current, [commentId]: false }));
      const refreshed = await forumsApi.getTopic(selectedTopic._id);
      patchTopicInState(refreshed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add reply');
    }
  }

  async function handleEditTopic() {
    if (!selectedTopic) {
      return;
    }

    const nextTitle = window.prompt('Edit topic title', selectedTopic.title);
    if (!nextTitle) {
      return;
    }

    const nextBody = window.prompt('Edit markdown content', selectedTopic.bodyMarkdown);
    if (!nextBody) {
      return;
    }

    try {
      const updated = await forumsApi.updateTopic(selectedTopic._id, {
        title: nextTitle,
        bodyMarkdown: nextBody,
      });
      patchTopicInState(updated);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not edit topic');
    }
  }

  async function handleDeleteTopic(topicId: string) {
    if (!window.confirm('Delete this topic and all its comments?')) {
      return;
    }

    try {
      await forumsApi.deleteTopic(topicId);
      await loadTopics();
      setMessage('Topic deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete topic');
    }
  }

  async function handleTogglePin() {
    if (!selectedTopic) {
      return;
    }

    try {
      const updated = await forumsApi.pinTopic(selectedTopic._id, !selectedTopic.pinned);
      patchTopicInState(updated);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not pin topic');
    }
  }

  async function handleToggleLock() {
    if (!selectedTopic) {
      return;
    }

    try {
      const updated = await forumsApi.lockTopic(selectedTopic._id, !selectedTopic.locked);
      patchTopicInState(updated);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not lock topic');
    }
  }

  async function handleReportTopic(topicId: string) {
    const reason = window.prompt('Why are you reporting this topic?');
    if (!reason?.trim()) {
      return;
    }

    try {
      await forumsApi.reportTopic(topicId, { reason: reason.trim() });
      setMessage('Topic reported.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not report topic');
    }
  }

  async function handleReportComment(commentId: string) {
    const reason = window.prompt('Why are you reporting this comment?');
    if (!reason?.trim()) {
      return;
    }

    try {
      await forumsApi.reportComment(commentId, { reason: reason.trim() });
      setMessage('Comment reported.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not report comment');
    }
  }

  async function handleEditComment(comment: ApiForumComment) {
    const nextBody = window.prompt('Edit markdown content', comment.bodyMarkdown);
    if (!nextBody?.trim()) {
      return;
    }

    try {
      const updated = await forumsApi.updateComment(comment._id, { bodyMarkdown: nextBody });
      setComments((current) => current.map((item) => (item._id === updated._id ? updated : item)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not edit comment');
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!window.confirm('Delete this comment?')) {
      return;
    }

    try {
      await forumsApi.deleteComment(commentId);
      setComments((current) => current.map((item) => (item._id === commentId ? { ...item, bodyMarkdown: '[deleted]', isDeleted: true } : item)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete comment');
    }
  }

  function renderComment(comment: ApiForumComment) {
    const childItems = childrenByParent.get(comment._id) ?? [];

    return (
      <article key={comment._id} className="forum-comment" style={{ marginLeft: `${Math.min(comment.depth * 18, 180)}px` }}>
        <header className="forum-comment-header">
          <strong>{comment.authorId?.username ?? 'Unknown'}</strong>
          <span>{toDate(comment.createdAt)}</span>
          {comment.editedAt && <span className="forum-muted">edited</span>}
        </header>
        <div className="forum-markdown" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(comment.isDeleted ? '*[deleted]*' : comment.bodyMarkdown) }} />
        <div className="forum-actions">
          <button type="button" className={comment.viewerVote === 1 ? 'cta ghost compact active' : 'cta ghost compact'} onClick={() => void handleCommentVote(comment._id, comment.viewerVote, 1)}>
            <ThumbsUp size={14} /> {comment.upvotes}
          </button>
          <button type="button" className={comment.viewerVote === -1 ? 'cta ghost compact active' : 'cta ghost compact'} onClick={() => void handleCommentVote(comment._id, comment.viewerVote, -1)}>
            <ThumbsDown size={14} /> {comment.downvotes}
          </button>
          {!isTopicLockedForUser && !comment.isDeleted && (
            <button type="button" className="cta ghost compact" onClick={() => setReplyOpen((current) => ({ ...current, [comment._id]: !current[comment._id] }))}>
              Reply
            </button>
          )}
          {comment.canModerate && !comment.isDeleted && (
            <>
              <button type="button" className="cta ghost compact" onClick={() => void handleEditComment(comment)}>
                Edit
              </button>
              <button type="button" className="cta ghost compact" onClick={() => void handleDeleteComment(comment._id)}>
                Delete
              </button>
            </>
          )}
          {!comment.isDeleted && (
            <button type="button" className="cta ghost compact" onClick={() => void handleReportComment(comment._id)}>
              <Flag size={14} /> Report
            </button>
          )}
        </div>
        {replyOpen[comment._id] && !isTopicLockedForUser && !comment.isDeleted && (
          <div className="forum-reply-box">
            <textarea
              rows={3}
              placeholder="Write a markdown reply..."
              value={replyDrafts[comment._id] ?? ''}
              onChange={(event) => setReplyDrafts((current) => ({ ...current, [comment._id]: event.target.value }))}
            />
            <button type="button" className="cta primary small" onClick={() => void handleCreateReply(comment._id)}>
              Post reply
            </button>
          </div>
        )}
        {childItems.length > 0 && <div className="forum-children">{childItems.map((child) => renderComment(child))}</div>}
      </article>
    );
  }

  const rootComments = childrenByParent.get('ROOT') ?? [];

  return (
    <article className="panel forum-panel">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">Game forum</span>
          <h2>Topics & discussions</h2>
        </div>
      </div>

      {message && <p className={message.includes('Could not') || message.includes('required') ? 'auth-message error' : 'auth-message success'}>{message}</p>}

      <div className="forum-controls">
        <input
          type="search"
          placeholder="Search topics"
          value={topicSearch}
          onChange={(event) => setTopicSearch(event.target.value)}
        />
        <select value={topicSort} onChange={(event) => setTopicSort(event.target.value as TopicSort)}>
          <option value="activity">Latest activity</option>
          <option value="latest">Newest topics</option>
          <option value="top">Top voted</option>
        </select>
        <button type="button" className="cta ghost small" onClick={() => void loadTopics()}>
          Refresh
        </button>
      </div>

      <form className="forum-create-topic" onSubmit={handleCreateTopic}>
        <input
          type="text"
          placeholder="New topic title"
          value={topicTitle}
          onChange={(event) => setTopicTitle(event.target.value)}
        />
        <textarea
          rows={4}
          placeholder="Write in Markdown..."
          value={topicBody}
          onChange={(event) => setTopicBody(event.target.value)}
        />
        <button type="submit" className="cta primary small">Create topic</button>
      </form>

      {topicsLoading && <p className="auth-message">Loading topics...</p>}
      {topicsError && <p className="auth-message error">{topicsError}</p>}

      <div className="forum-topics-grid">
        <div className="forum-topics-list">
          {topics.length === 0 && !topicsLoading && <div className="empty-state compact"><p>No topics yet.</p></div>}
          {topics.map((topic) => (
            <button
              key={topic._id}
              type="button"
              className={selectedTopicId === topic._id ? 'forum-topic-item active' : 'forum-topic-item'}
              onClick={() => setSelectedTopicId(topic._id)}
            >
              <div>
                <strong>{topic.title}</strong>
                <p>by {topic.authorId?.username ?? 'Unknown'} · {toDate(topic.createdAt)}</p>
              </div>
              <div className="forum-topic-meta">
                {topic.pinned && <span className="pill static">Pinned</span>}
                {topic.locked && <span className="pill static">Locked</span>}
                <span className="pill static">{topic.commentCount} comments</span>
              </div>
            </button>
          ))}
        </div>

        <div className="forum-thread-view">
          {!selectedTopic && <div className="empty-state"><p>Select a topic to open the thread.</p></div>}

          {selectedTopic && (
            <>
              <header className="forum-thread-header">
                <div>
                  <h3>{selectedTopic.title}</h3>
                  <p>by {selectedTopic.authorId?.username ?? 'Unknown'} · {toDate(selectedTopic.createdAt)}</p>
                </div>
                <div className="forum-actions wrap">
                  <button type="button" className={selectedTopic.viewerVote === 1 ? 'cta ghost compact active' : 'cta ghost compact'} onClick={() => void handleTopicVote(selectedTopic._id, selectedTopic.viewerVote, 1)}>
                    <ThumbsUp size={14} /> {selectedTopic.upvotes}
                  </button>
                  <button type="button" className={selectedTopic.viewerVote === -1 ? 'cta ghost compact active' : 'cta ghost compact'} onClick={() => void handleTopicVote(selectedTopic._id, selectedTopic.viewerVote, -1)}>
                    <ThumbsDown size={14} /> {selectedTopic.downvotes}
                  </button>
                  <button type="button" className="cta ghost compact" onClick={() => void handleReportTopic(selectedTopic._id)}>
                    <Flag size={14} /> Report
                  </button>
                  {selectedTopic.canModerate && (
                    <>
                      <button type="button" className="cta ghost compact" onClick={() => void handleTogglePin()}>
                        <Pin size={14} /> {selectedTopic.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button type="button" className="cta ghost compact" onClick={() => void handleToggleLock()}>
                        <Lock size={14} /> {selectedTopic.locked ? 'Unlock' : 'Lock'}
                      </button>
                      <button type="button" className="cta ghost compact" onClick={() => void handleEditTopic()}>
                        Edit
                      </button>
                      <button type="button" className="cta ghost compact" onClick={() => void handleDeleteTopic(selectedTopic._id)}>
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </header>

              <div className="forum-markdown" dangerouslySetInnerHTML={{ __html: markdownToSafeHtml(selectedTopic.bodyMarkdown) }} />

              <div className="forum-controls">
                <div className="forum-comments-title">
                  <MessageSquare size={16} />
                  <strong>Comments</strong>
                </div>
                <select value={commentSort} onChange={(event) => setCommentSort(event.target.value as CommentSort)}>
                  <option value="oldest">Oldest first</option>
                  <option value="latest">Newest first</option>
                  <option value="top">Top voted</option>
                </select>
              </div>

              {selectedTopic.locked && <p className="auth-message">This topic is locked. Only author/admin can post.</p>}

              {!isTopicLockedForUser && (
                <form className="forum-create-comment" onSubmit={handleCreateComment}>
                  <textarea
                    rows={4}
                    placeholder="Write a markdown comment..."
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                  />
                  <button type="submit" className="cta primary small">Post comment</button>
                </form>
              )}

              {commentsLoading && <p className="auth-message">Loading comments...</p>}
              <div className="forum-comments-list">
                {rootComments.length === 0 && !commentsLoading ? (
                  <div className="empty-state compact"><p>No comments yet.</p></div>
                ) : (
                  rootComments.map((comment) => renderComment(comment))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
