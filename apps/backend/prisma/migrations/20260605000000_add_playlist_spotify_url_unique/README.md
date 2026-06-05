# Migration: add_playlist_spotify_url_unique

Adds a unique constraint on `Playlist.spotifyUrl` to enforce DB-level idempotency
for playlist creation. This supports the `playlistTrack` download kind where
concurrent requests may attempt to create the same parent playlist row.

## Pre-flight check (REQUIRED before applying to existing databases)

Run the following SQL to verify no duplicate `spotifyUrl` values exist:

```sql
SELECT spotifyUrl, COUNT(*) c
FROM Playlist
GROUP BY spotifyUrl
HAVING c > 1;
```

### If the query returns no rows

The migration is safe to apply. Proceed with:

```bash
pnpm --filter backend run prisma:migrate:deploy
```

### If the query returns one or more rows (duplicate spotifyUrl values)

You must deduplicate before applying the migration. For each duplicated `spotifyUrl`,
keep the oldest row (lowest `createdAt`) and delete the rest:

```sql
-- Identify the IDs to keep (oldest row per spotifyUrl)
-- Example cleanup — adjust as needed for your data:
DELETE FROM Playlist
WHERE id NOT IN (
  SELECT MIN(id)
  FROM Playlist
  GROUP BY spotifyUrl
);
```

After deduplication, re-run the pre-flight query to confirm zero duplicates,
then apply the migration.

## Notes

- This constraint is safe on fresh databases and on any database where
  application-level dedup has been consistently enforced (the expected case).
- Existing `Playlist` rows with `type="track"` created before this migration
  are NOT retroactively re-parented. They continue to render correctly in the UI.
