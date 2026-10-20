/** Minimal slice of the Storage API used to sweep a user's folder. */
export interface StorageLister {
  from(bucket: string): {
    list(prefix: string, opts: { limit: number }): PromiseLike<{
      data: { name: string; id: string | null }[] | null;
      error: { message: string } | null;
    }>;
  };
}

/** Lists every object under `prefix`, descending into folders (entries with no id). */
export async function listFiles(storage: StorageLister, bucket: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 3) return [];
  const { data, error } = await storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(error.message);
  const paths: string[] = [];
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id) paths.push(path);
    else paths.push(...(await listFiles(storage, bucket, path, depth + 1)));
  }
  return paths;
}
