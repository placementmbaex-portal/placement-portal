import { redirect } from "next/navigation";

// Moved under Settings (DESIGN.md's Navigation restructure) -- kept as a
// redirect rather than a 404 for anyone with the old URL bookmarked.
export default function AdminStudentsRedirect() {
  redirect("/admin/settings/access");
}
