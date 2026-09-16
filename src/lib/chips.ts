export type AnnouncementCategory =
  | "ppt"
  | "shortlist"
  | "deadline"
  | "process"
  | "general";

export type ChipStyle = { label: string; bg: string; text: string };

// DESIGN.md's category-chip table. A closed, defined exception to "colour
// reserved for time" -- these mark what something IS, not when it's due.
export const CATEGORY_CHIPS: Record<AnnouncementCategory, ChipStyle> = {
  ppt: { label: "Pre-placement talk", bg: "#E7EEF6", text: "#014488" },
  shortlist: { label: "Shortlist", bg: "#E4F1EC", text: "#0C6B49" },
  deadline: { label: "Deadline change", bg: "#FDEAE0", text: "#B03604" },
  process: { label: "Process", bg: "#F2EAE4", text: "#5C3111" },
  general: { label: "General notice", bg: "#ECEFF3", text: "#4C5866" },
};

export const PINNED_CHIP: ChipStyle = {
  label: "Pinned",
  bg: "#E7EEF6",
  text: "#014488",
};
