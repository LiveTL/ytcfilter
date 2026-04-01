# YtcFilter Codex Workflow

## Scope

- YtcFilter is an MV3-only extension repo.
- `master` is the shipping branch.
- This repo does not use HyperChat as a submodule.
- Instead, it tracks HyperChat through the `hc` git remote and merges upstream chat/runtime changes into this tree.

## Repo Model

- HC is the upstream shared chat machinery.
- LTL consumes HC as a submodule.
- YTCF is a fork-style HC consumer with a large in-tree YTCF layer.
- Do not treat YTCF like LiveTL. There is no `develop -> mv3-fr -> release` ladder here.
- Do not assume any `mv2 -> mv3` branch choreography inside this repo. YTCF is MV3-only now.

## Branch Discipline

- Work on `master` unless the user explicitly asks for something else.
- The local `mv3` branch is historical. Do not use it as the normal source branch.
- Keep `master` in sync with `origin/master`.

## Sync Model (Mandatory)

- Shared HC fixes should be landed in HyperChat first when they truly belong upstream.
- After the HC side is ready, pull those changes into YTCF by merging:
  - `hc/main` -> `master`
- Do not hand-copy large HC changes into YTCF when the real relationship is an upstream merge.
- Do not invent a submodule-style bump process here. The sync mechanism is git merge from the `hc` remote.
- When merging `hc/main`, preserve YTCF-owned behavior and resolve conflicts in favor of the repo's actual product model.

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
  - setup / migration flow
  - YTCF settings UI
  - YTCF button bar and panel behavior

## Runtime Model

- On YouTube chat pages, `src/scripts/chat-injector.ts` installs the interception path and mounts the YTCF button bar.
- The panel/popup UI mounts through `src/scripts/chat-mounter.ts` into `https://www.youtube.com/embed/ytcfilter_embed?...`.
- `src/ts/chat-parser.ts` normalizes YT actions.
- `src/ts/queue.ts` handles live/replay timing and incremental delivery.
- `src/ts/messaging.ts` bridges the injected side and mounted UI side.
- `src/ts/ytcf-logic.ts` is the main YTCF behavior layer.
- The rendered chat is not the raw chat feed. Messages are shown only if they match the active preset.

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
- Archives are first-class YTCF data, not incidental debug output.
- `Block user` and `Report user` are YouTube-side actions.
- `Delete` in the message menu is only local YTCF-side removal from the current rendered/archive view.

## House Style

- Commit subjects should stay short, direct, and easy to scan.
- Prefer active voice and plain wording:
  - `merge hc main`
  - `fix archive import`
  - `tweak preset ui`
- Avoid padded scopes, issue-number prefixes, and long explanatory subjects.
- Mildly funny is fine if the subject is still immediately clear.
- Prefer proper merges for upstream HC syncs instead of manually replaying many commits.

## Build And Tooling

- Use `npm`, not `yarn`, in this repo.
- Install dependencies with:
  - `npm install --force`
- Main commands:
  - `npm run build`
  - `npm run build:chrome`
  - `npm run build:firefox`
  - `npm run dev:chrome`
- `npm run dev:firefox`
- `npm run start:chrome`
- `npm run start:firefox`
- CI currently uses Node 22.
- Local builds can fail in misleading ways if `node_modules` was installed under an incompatible or mixed Node environment.
- If a local build behaves strangely:
  - remove `node_modules`
  - reinstall with `npm install --force` under a stable Node line
  - then retry the build
- Verified locally on 2026-04-01:
  - clean reinstall under Node `16.20.2`
  - `npm run build:chrome` succeeds
  - `npm run build:firefox` succeeds
  - after that clean reinstall, the same builds also succeed under Node `22.21.1`
- `npm ci` is not the reliable path here at the moment because the committed lockfile is not cleanly in sync with the current package manifest.

## Validation Notes

- A fresh profile will redirect into setup until `ytcf.initialSetupDone` is true.
- Useful surfaces to inspect when validating behavior:
  - `options.html`
  - `setup.html`
  - `hyperchat.html`
- For runtime debugging, remember that the button bar lives in the native YouTube chat page while the main filtered view lives in the YTCF iframe/popout.
