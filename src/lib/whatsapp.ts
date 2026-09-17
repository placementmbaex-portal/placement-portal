import { formatDateTimeIST } from "@/lib/format";

// Reference list for the Settings UI -- not used to validate templates,
// just to tell an admin what's available.
export const WHATSAPP_PLACEHOLDERS = [
  "company",
  "title",
  "location",
  "deadline",
  "link",
  "excerpt",
  "applied_count",
  "total_students",
] as const;

export const DEFAULT_WHATSAPP_TEMPLATES = {
  job: "New role open: {company} — {title}\n{location}\nApply by {deadline}\n\n{link}",
  announcement: "{title}\n\n{excerpt}\n\n{link}",
  reminder: "{company} — {title} (closes {deadline})\n{link}",
};

export const WHATSAPP_MESSAGE_SOFT_LIMIT = 600;

export type WhatsAppValues = {
  company?: string | null;
  title?: string | null;
  location?: string | null;
  deadlineIso?: string | null;
  link?: string | null;
  // Raw announcement body -- stripped and truncated in here, callers never
  // pre-process it themselves.
  excerptSource?: string | null;
  appliedCount?: number | null;
  totalStudents?: number | null;
};

// Markdown is never authored through a real editor here -- announcement
// bodies come from a plain textarea -- but an admin can still type
// **bold**, a [link](url) or a "# heading" by hand, so this strips the
// common syntax rather than sending literal asterisks and brackets to a
// WhatsApp group.
export function stripMarkdownExcerpt(raw: string, maxLen = 180): string {
  const text = raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLen) return text;

  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  const trimmed = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${trimmed}…`;
}

// Fills every {placeholder}. A line whose only content was a placeholder
// that resolved to nothing is dropped entirely -- this is how {location}
// either renders "Location: Mumbai" or disappears without a trace on a
// role with none set (same treatment applies to every other placeholder,
// e.g. a role with no deadline just loses the "Apply by ..." line). A
// line with static text alongside an empty placeholder keeps its text and
// just loses the token. Any placeholder name this function doesn't
// recognise is wiped in the final pass too, so a stale or misspelled
// token never survives into what actually gets sent.
export function fillWhatsAppTemplate(template: string, values: WhatsAppValues): string {
  const map: Record<string, string> = {
    company: values.company?.trim() || "",
    title: values.title?.trim() || "",
    location: values.location?.trim() ? `Location: ${values.location.trim()}` : "",
    deadline: values.deadlineIso ? `${formatDateTimeIST(values.deadlineIso)} IST` : "",
    link: values.link?.trim() || "",
    excerpt: values.excerptSource?.trim() ? stripMarkdownExcerpt(values.excerptSource) : "",
    applied_count: values.appliedCount != null ? String(values.appliedCount) : "",
    total_students: values.totalStudents != null ? String(values.totalStudents) : "",
  };

  const lines = template.split("\n").map((line) => {
    const hadPlaceholder = /\{[a-z_]+\}/.test(line);
    const substituted = line.replace(/\{([a-z_]+)\}/g, (_, key: string) => map[key] ?? "");
    return hadPlaceholder && substituted.trim() === "" ? null : substituted;
  });

  return lines
    .filter((line): line is string => line !== null)
    .join("\n")
    .replace(/\{[a-z_]+\}/g, "") // safety net: never leave an unsubstituted placeholder
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function templateDropsLink(template: string): boolean {
  return !template.includes("{link}");
}
