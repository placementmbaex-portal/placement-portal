import { redirect } from "next/navigation";

// Moved under Settings (DESIGN.md's Navigation restructure) -- kept as a
// redirect rather than a 404 for anyone with the old URL bookmarked.
export default async function AdminProfileFieldEditRedirect({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  redirect(`/admin/settings/profile-fields/${key}/edit`);
}
