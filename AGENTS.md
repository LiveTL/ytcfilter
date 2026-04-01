# YtcFilter Codex Workflow

## Scope

- YTCF is an MV3-only extension repo.
- `master` is the shipping branch.
- This repo does not use HyperChat as a submodule.
- Shared HC changes come in by merging `hc/main` into `master`.

## Repo Model

- HC is the upstream shared chat backbone.
- LTL embeds HC as a submodule.
- YTCF is an HC-based codebase with a large in-tree YTCF layer.
- Do not treat YTCF like LTL. There is no `develop -> mv3-fr -> release` ladder here.
- Do not invent an HC-style `mv2 -> mv3` ladder here. YTCF is MV3-only.

## Branch Discipline

- Work on `master` unless the user explicitly asks for something else.
- Keep `master` in sync with `origin/master`.
- The old local `mv3` branch is historical. Do not use it as the normal source branch.

## Sync Model (Mandatory)

- If a fix belongs in shared HC behavior, land it in HC first.
- Then pull it into YTCF by merging:
  - `hc/main` -> `master`
- Prefer a proper merge over hand-copying many HC commits.
- Resolve merge conflicts in YTCF terms:
  - keep YTCF filters, presets, triggers, archives, setup, and panel UI
  - take HC backbone fixes in shared parsing, rendering, messaging, and runtime plumbing

## Code Boundaries

- HC-derived areas in this repo:
  - chat parsing
  - queueing/timing
  - chat rendering shell
  - embed/popout mounting
  - YouTube-side admin action plumbing
- YTCF-owned areas in this repo:
  - filter engine
  - presets
  - preset triggers / auto-activation
  - archive persistence / import / export
  - setup / migration
  - YTCF settings UI
  - YTCF button bar and panel behavior

## Runtime Model

- `src/scripts/chat-injector.ts` installs the interception path on native YouTube chat pages and mounts the YTCF button bar.
- `src/scripts/chat-mounter.ts` mounts the main YTCF panel into `https://www.youtube.com/embed/ytcfilter_embed?...`.
- `src/ts/chat-parser.ts` normalizes YT actions.
- `src/ts/queue.ts` handles live/replay timing.
- `src/ts/messaging.ts` bridges the injected side and the mounted UI side.
- `src/ts/ytcf-logic.ts` is the main YTCF behavior layer.
- The rendered chat is not the raw feed. Messages are shown only if they match the active preset.

## Main UI Surfaces

- Injected chat controls:
  - `src/components/YtcFilterButtons.svelte`
- Filtered chat panel / popout:
  - `src/components/Hyperchat.svelte`
- Settings app:
  - `src/components/YtcFilterSettings.svelte`
- First-run setup / migration:
  - `src/components/YtcFilterSetup.svelte`

## Important Behavior Notes

- Filters are keep-rules, not hide-rules:
  - conditions inside one filter are AND
  - filters inside a preset are OR
  - a message is shown if it matches an enabled filter
- Presets can auto-activate from channel/video metadata.
- Archives are real YTCF data, not incidental debug output.
- `Block user` and `Report user` are YouTube-side actions.
- `Delete` in the message menu is local YTCF-side removal from the current rendered/archive view.

## House Style

- Commit subjects should be short, direct, and easy to scan in `git log --oneline`.
- Prefer active voice and plain wording:
  - `merge hc main`
  - `fix archive import`
  - `agent map`
- Avoid padded scopes, issue-number prefixes, and long explanatory subjects.
- Mildly funny is fine if the subject is still immediately clear.

## Shared HC Patterns To Preserve

- Keep author/channel identity data untouched and apply display-only formatting at render edges.
- Use `src/ts/component-utils.ts` for author-name formatting.
- Do not assume fixed YouTube menu indices for block/report behavior.
- Keep proxy fetch request/response events correlated by request id.
- Prefer fixing shared parser/messaging/util code before patching several UI surfaces by hand.

## Build And Tooling

- Use `npm`, not `yarn`, in this repo.
- If the local install looks stale or Node changed, do a clean reinstall:
  - `rm -rf node_modules`
  - `n exec 22.21.1 npm install --force`
- Main commands:
  - `npm run build`
  - `npm run build:chrome`
  - `npm run build:firefox`
  - `npm run dev:chrome`
  - `npm run dev:firefox`
  - `npm run start:chrome`
  - `npm run start:firefox`
- Verified locally on 2026-04-01:
  - clean reinstall under Node `16.20.2` works
  - after that, `build:chrome` and `build:firefox` also work under Node `22.21.1`
- CI uses Node `22`.
- Unpacked output layout:
  - Chrome build lives at `build/`
  - Firefox build lives at `build/firefox/`
  - zip artifacts land in `build/`

## Runtime Validation

- A fresh profile will redirect into setup until `ytcf.initialSetupDone` is true.
- Preset/filter edits are not expected to hot-patch an already mounted filtered panel.
- After changing filters in settings, reload/remount the panel before judging runtime behavior.
- Useful extension pages:
  - `setup.html`
  - `options.html`
  - `hyperchat.html`
- Convenience helper:
  - `CHROME_BIN=/snap/bin/chromium bash scripts/codex-dev.sh go-test`
- The helper auto-detects whether the unpacked MV3 build lives at `build/` or `build/chrome/`.
- In this environment, the most reliable Chromium smoke path is still the direct manual command:

```bash
rm -rf /tmp/ytcf-manual-profile
xvfb-run -a /snap/bin/chromium \
  --disable-gpu \
  --ozone-platform=headless \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/ytcf-manual-profile \
  --disable-extensions-except="$PWD/build" \
  --load-extension="$PWD/build" \
  --no-first-run \
  --no-default-browser-check \
  --disable-background-timer-throttling \
  --disable-renderer-backgrounding \
  --disable-dev-shm-usage \
  --disable-features=IsolateOrigins,site-per-process,TranslateUI \
  --disable-web-security \
  --allow-running-insecure-content \
  --allow-insecure-localhost \
  --no-sandbox \
  --disable-setuid-sandbox \
  --noerrdialogs \
  --disable-notifications \
  --disable-translate \
  --disable-infobars \
  --autoplay-policy=no-user-gesture-required \
  "https://www.youtube.com/watch?v=jfKfPfyJRdk"
```
- That manual path was the one verified on 2026-04-01 for:
  - injected YTCF button bar
  - embedded `ytcfilter_embed` iframe
  - setup page and options page rendering
- Useful helper commands:
  - `bash scripts/codex-dev.sh watch`
  - `bash scripts/codex-dev.sh reload`
  - `bash scripts/codex-dev.sh status`
  - `bash scripts/codex-dev.sh stop`
- Default testbed URL comes from `vite.config.ts`:
  - `https://www.youtube.com/watch?v=jfKfPfyJRdk`
- Treat `reload` as the default after significant runtime changes to:
  - `src/scripts/**`
  - `src/components/**`
  - `src/ts/**`
  - `src/manifest.json`
  - `vite.config.ts`

## Bump Checklist

1. `git fetch hc`
2. `git checkout master`
3. `git merge --no-ff hc/main`
4. Resolve conflicts by keeping YTCF-owned behavior and taking HC backbone fixes.
5. Clean reinstall if needed:
   - `rm -rf node_modules`
   - `n exec 22.21.1 npm install --force`
6. Rebuild:
   - `n exec 22.21.1 npm run build:chrome`
   - `n exec 22.21.1 npm run build:firefox`
7. Run MV3 runtime smoke:
   - `CHROME_BIN=/snap/bin/chromium bash scripts/codex-dev.sh go-test`
   - if the helper is flaky under snap Chromium, use the manual `xvfb-run` command from the Runtime Validation section
8. Spot-check:
   - setup page
   - options page
   - filtered panel / popout
   - native chat button bar
   - after filter edits, reload/remount and then retest the mounted panel
9. Commit the merge with a short subject.

## Release Notes Style

- Keep bullets short and user-facing.
- Prefer active voice:
  - `Fix block/report actions`
  - `Hide leading @ in names`
- Avoid passive voice, filler, and overly technical wording unless the note is for maintainers.
