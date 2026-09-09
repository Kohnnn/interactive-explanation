# Rigid-body upstream source finding — final W0 review

Date: 2026-09-09. Inspected integration `f51e601`, including bounded prerequisite fix `83ae687`. W0 release remains BLOCKED; this is source discovery, not permission or runtime acceptance.

## Local compiled evidence

`interactive-explanation/rigid-body-collisions/_nuxt/D4VqJVMa.js:22` defines compiled routes `index` at `/` loading `Cr4Zn1Te.js`, and `rigid-body-collisions-id` at `/rigid-body-collisions/:id()` loading `CHFHx5dx.js`. The lesson requires an `id`; the flattened local route does not supply it. No supported HTML-only route-mapping seam was found. `index.html` retains `app.baseURL:"./"` and deployment build ID `0a165293-4de5-48b7-bef4-7264eea290d1`.

Research37 records the reverted baseURL experiment: an absolute served base removed Page not found but selected the compiled home route, replaced lesson content and removed sliders; hydration mismatch remained. No experimental baseURL or compiled engine edit is retained. All18 diagnostic samples retain initialization errors; slider presence/input is not simulation correctness.

## Public source discovery

Authenticated read-only GitHub API enumeration (`gh api --paginate 'users/ksassnowski/repos?per_page=100'`) completed during final review. No matching Nuxt application/deployment source was identified among the public repository listings. This is not proof that private or otherwise unpublished source does not exist.

- `ksassnowski/blog`, master `109ea33e55c7dc7ba278fb97bdde1927992b82f5`: Git tree has `Gemfile`, `_config.yml`, `_layouts`, `_posts`, `_includes`; it is the Jekyll blog, not the deployed Nuxt application. Commands: `gh api repos/ksassnowski/blog/commits/master --jq .sha`; `gh api repos/ksassnowski/blog/git/trees/109ea33 --jq '.tree[].path'`.
- `ksassnowski/vueclid`, main `0111623bead813d9c24bf3110cbd298da24a0c41`: package `@ksassnowski/vueclid` version1.2.0 exports built diagram-library modules; build uses Vite and vue-tsc. Its MIT `LICENSE` covers that library, not the collision application/deployment. Commands: `gh api repos/ksassnowski/vueclid/commits/main --jq .sha`; `gh api repos/ksassnowski/vueclid/contents/package.json?ref=011162 --jq .content`; `gh api repos/ksassnowski/vueclid/license --jq '[.license.spdx_id,.path]'`.

Cannot certify matching application source or redistribution/modification rights from these repositories or bundled dependency notices. The next prerequisite is upstream-author-supplied application source matching deployment `0a165293-4de5-48b7-bef4-7264eea290d1`, plus applicable permission/license, before a supported source rebuild and route mapping can be qualified. No contact was sent. User authorizes a checkpoint integration into main, not deployment; this implementer performs no merge or push. W1–W5 remain not started.
