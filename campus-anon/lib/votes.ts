import { supabase } from "./supabase";

type VoteTable = "post_votes" | "comment_votes";
type IdColumn = "post_id" | "comment_id";

// Clicking the same arrow again removes your vote.
// Clicking the other arrow switches your vote.
// Returns an error message, or null when it worked.
export async function castVote(
  table: VoteTable,
  idColumn: IdColumn,
  itemId: string,
  current: number,
  value: 1 | -1
): Promise<string | null> {
  if (current === value) {
    const { error } = await supabase.from(table).delete().eq(idColumn, itemId);
    return error ? error.message : null;
  }

  const { error } = await supabase
    .from(table)
    .upsert({ [idColumn]: itemId, value }, { onConflict: `${idColumn},user_id` });
  return error ? error.message : null;
}
