"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/format";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(app)/notifications/actions";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [unread, setUnread] = useState(unreadCount);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleItemClick(item: NotificationItem) {
    if (!item.read_at) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnread((n) => Math.max(0, n - 1));
      void markNotificationRead(item.id);
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnread(0);
    void markAllNotificationsRead();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 15V10a6 6 0 0 0-12 0v5l-2 3h16z" />
          <path d="M10 21h4" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-closing px-1 font-body text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 z-20 max-h-[70vh] w-[min(92vw,360px)] overflow-y-auto rounded-xl border border-rule bg-surface shadow-[0_8px_24px_rgba(11,37,69,0.16)]">
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <p className="font-body text-[13px] font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[12.5px] font-medium text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-slate">Nothing yet.</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-rule last:border-0">
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className="flex w-full items-start gap-2.5 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read_at ? "bg-transparent" : "bg-navy"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-[1.4] font-medium text-ink">
                        {item.title}
                      </span>
                      {item.body && (
                        <span className="mt-0.5 block text-[12.5px] leading-[1.4] text-slate">
                          {item.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[11.5px] text-shut">
                        {formatRelativeTime(item.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
