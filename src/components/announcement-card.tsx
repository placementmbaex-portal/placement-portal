"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { formatDateTimeIST } from "@/lib/format";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import {
  addComment,
  deleteComment,
  viewAnnouncementAttachment,
  type CommentFormState,
} from "@/lib/announcements/actions";

export type CommentData = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
};

export type AnnouncementData = {
  id: string;
  title: string;
  body: string;
  isPinned: boolean;
  attachmentPath: string | null;
  publishedAt: string;
  commentsLocked: boolean;
  authorName: string;
  company: { id: string; name: string } | null;
  job: { id: string; title: string } | null;
};

export function AnnouncementCard({
  announcement,
  comments,
  currentUserId,
  isAdmin,
}: {
  announcement: AnnouncementData;
  comments: CommentData[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesByParent = new Map<string, CommentData[]>();
  for (const comment of comments) {
    if (comment.parentId) {
      repliesByParent.set(comment.parentId, [
        ...(repliesByParent.get(comment.parentId) ?? []),
        comment,
      ]);
    }
  }

  return (
    <div
      id={`announcement-${announcement.id}`}
      className={
        announcement.isPinned
          ? "border-l-[3px] border-navy py-6 pl-4"
          : "py-6"
      }
    >
      <p className="font-display text-[21px] leading-[1.3] font-semibold text-ink">
        {announcement.title}
      </p>
      <p className="mt-1 text-[13.5px] leading-[1.45] text-slate">
        {announcement.authorName} ·{" "}
        {formatDateTimeIST(announcement.publishedAt)} IST
      </p>
      <p className="mt-3 max-w-[68ch] whitespace-pre-wrap text-[15px] leading-[1.55] text-ink">
        {announcement.body}
      </p>

      {(announcement.company || announcement.job) && (
        <p className="mt-3 text-[13.5px] leading-[1.45]">
          {announcement.company && (
            <Link
              href={`/companies/${announcement.company.id}`}
              className="text-navy hover:underline"
            >
              {announcement.company.name}
            </Link>
          )}
          {announcement.company && announcement.job && (
            <span className="text-slate"> · </span>
          )}
          {announcement.job && (
            <Link
              href={`/jobs/${announcement.job.id}`}
              className="text-navy hover:underline"
            >
              {announcement.job.title}
            </Link>
          )}
        </p>
      )}

      {announcement.attachmentPath && (
        <form
          action={viewAnnouncementAttachment.bind(
            null,
            announcement.id,
            announcement.attachmentPath,
          )}
          className="mt-3"
        >
          <button
            type="submit"
            formTarget="_blank"
            className="text-[13.5px] text-navy hover:underline"
          >
            View attachment
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-4 text-[13.5px] text-slate hover:underline"
      >
        {comments.length === 0
          ? "Add a comment"
          : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {topLevel.map((comment) => (
            <div key={comment.id}>
              <CommentRow
                comment={comment}
                canDelete={
                  comment.authorId === currentUserId || isAdmin
                }
                canReply={!announcement.commentsLocked}
                onReply={() => setReplyingTo(comment.id)}
              />
              {(repliesByParent.get(comment.id) ?? []).map((reply) => (
                <div key={reply.id} className="mt-3 pl-6">
                  <CommentRow
                    comment={reply}
                    canDelete={
                      reply.authorId === currentUserId || isAdmin
                    }
                    canReply={false}
                  />
                </div>
              ))}
              {replyingTo === comment.id && (
                <div className="mt-3 pl-6">
                  <CommentForm
                    announcementId={announcement.id}
                    parentId={comment.id}
                    onPosted={() => setReplyingTo(null)}
                  />
                </div>
              )}
            </div>
          ))}

          {announcement.commentsLocked ? (
            <p className="text-[13.5px] text-slate">
              Comments are locked on this announcement.
            </p>
          ) : (
            <CommentForm announcementId={announcement.id} parentId={null} />
          )}
        </div>
      )}
    </div>
  );
}

function CommentRow({
  comment,
  canDelete,
  canReply,
  onReply,
}: {
  comment: CommentData;
  canDelete: boolean;
  canReply: boolean;
  onReply?: () => void;
}) {
  return (
    <div>
      <p className="text-[13.5px] leading-[1.45] text-slate">
        {comment.authorName} · {formatDateTimeIST(comment.createdAt)} IST
      </p>
      <p className="mt-0.5 text-[15px] leading-[1.55] text-ink">
        {comment.body}
      </p>
      {(canReply || canDelete) && (
        <div className="mt-1 flex gap-4 text-[13.5px]">
          {canReply && onReply && (
            <button
              type="button"
              onClick={onReply}
              className="text-slate hover:underline"
            >
              Reply
            </button>
          )}
          {canDelete && (
            <form action={deleteComment.bind(null, comment.id)}>
              <ConfirmSubmitButton
                confirmMessage="Delete this comment? This cannot be undone."
                pendingLabel="Deleting…"
                className="text-closing underline underline-offset-2 disabled:opacity-60"
              >
                Delete
              </ConfirmSubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

const initialCommentState: CommentFormState = null;

function CommentForm({
  announcementId,
  parentId,
  onPosted,
}: {
  announcementId: string;
  parentId: string | null;
  onPosted?: () => void;
}) {
  const [state, action, pending] = useActionState(
    addComment.bind(null, announcementId, parentId),
    initialCommentState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      onPosted?.();
    }
    // onPosted intentionally excluded: callers pass a fresh closure each
    // render, and re-running this on every render would fight the reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <label htmlFor={`comment-${parentId ?? announcementId}`} className="sr-only">
        {parentId ? "Reply" : "Comment"}
      </label>
      <textarea
        id={`comment-${parentId ?? announcementId}`}
        name="body"
        required
        rows={2}
        placeholder={parentId ? "Write a reply…" : "Write a comment…"}
        className="w-full rounded-md border border-rule px-3 py-2 text-[15px] text-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
      />
      {state?.error && (
        <p className="text-[13.5px] text-closing">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex h-10 items-center rounded-md border border-navy px-4 text-[13.5px] font-medium text-navy hover:bg-surface disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending ? "Posting…" : parentId ? "Post reply" : "Post comment"}
      </button>
    </form>
  );
}
