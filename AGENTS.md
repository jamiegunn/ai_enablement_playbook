## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Content rules (read SITE-PLAN.md first)

- Every page: `title`, benefit-phrased `description`, `keywords`, unique `sidebar.order`. No H1 in the body.
- Root-relative internal links with trailing slashes (`/kt/quick-start/`). Run `npm run lint` before finishing — it must report 0 errors.
- Commands are complete and runnable as written, with the cast's real names, and are followed by a `console` block of representative output.
- Every command block that crosses a boundary starts with a seat comment: `# seat: team`, `# seat: team — needs <thing>`, `# seat: platform — shown so you can read THEIR output`.
- Vendor facts (flags, endpoints, action versions) come from `docs/research/` — if a page needs a fact that isn't there, verify it against the vendor's docs and add it.
- Mermaid via plain ```mermaid fences. Asides: `:::note/tip/caution/danger[Title]`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
