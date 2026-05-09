# podcast.hegechristine.no

The Edit-podcasten med Hege Christine. Statisk side med RSS-sync via GitHub Actions.

**Live:** https://podcast.hegechristine.no

## Struktur

| Fil | Hva |
|---|---|
| `index.html` | Frontend — laster `episodes.json` ved oppstart |
| `episodes.json` | Episodeliste, generert av sync-jobben |
| `feed.config.json` | RSS-feed-URL (kilden) |
| `assets/` | Bilder, ikoner, fonts |
| `.github/workflows/sync-podcast.yml` | Daglig sync (06:00 UTC) + ved push |
| `.github/scripts/sync-podcast.mjs` | Script som henter RSS og lager `episodes.json` |

## Sync-flyt

1. Cron eller manuell trigger starter workflow
2. Workflow installerer deps i `.github/scripts/`, kjører `sync-podcast.mjs`
3. Script henter RSS-feed (Anchor.fm), parser den, skriver `episodes.json`
4. Hvis endringer: bot committer + pusher

## Hosting

- GitHub Pages, branch `main`, root `/`
- Custom domain `podcast.hegechristine.no` (CNAME-fil)
- DNS: CNAME `podcast` → `hegechristine.github.io` i Pro-ISP
