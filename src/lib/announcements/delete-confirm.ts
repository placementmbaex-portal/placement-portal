// Shared by every surface that can soft-delete an announcement (admin list,
// moderation queue, the feed card) so the comment-count warning reads the
// same everywhere and never drifts out of sync.
export function announcementDeleteConfirmMessage(title: string, commentCount: number) {
  const commentsLine =
    commentCount > 0
      ? ` This announcement has ${commentCount} comment${commentCount === 1 ? "" : "s"}. They will be hidden with it.`
      : "";
  return `Delete "${title}"?${commentsLine} It can be restored from Trash.`;
}
