// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import { rehypeBaseLinks } from './src/plugins/rehype-base-links.mjs';
import { remarkMermaid } from './src/plugins/remark-mermaid.mjs';

// GitHub Pages: SITE is your GitHub Pages origin, BASE is the repo name.
// If you rename the repo or move to a custom domain, update these two lines.
// (Hero action links in src/content/docs/index.mdx hardcode BASE — update there too.)
const SITE = 'https://jamiegunn.github.io';
const BASE = '/ai_enablement_playbook';

// https://astro.build/config
export default defineConfig({
	site: SITE,
	base: BASE,
	markdown: {
		// remarkMermaid must run before Expressive Code so ```mermaid fences
		// become raw <pre class="mermaid"> for client-side rendering.
		remarkPlugins: [remarkMermaid],
		rehypePlugins: [rehypeBaseLinks(BASE)],
	},
	integrations: [
		starlight({
			title: 'AI Enablement Playbook',
			description:
				'A field guide for engineering teams putting AI to work on the problems that actually hurt: onboarding onto legacy code, and testing while everyone sleeps.',
			// Mermaid rendering is bundled (self-hosted) via a client script in the
			// MarkdownContent override — see src/components/MarkdownContent.astro.
			// Override the markdown wrapper so per-page `keywords` frontmatter is
			// injected as hidden, Pagefind-indexed text. See the component and
			// src/content.config.ts for the full mechanism.
			components: {
				MarkdownContent: './src/components/MarkdownContent.astro',
			},
			// Pagefind ranking tuned to favour relevance breadth over exact,
			// term-dense matches — so pages that pertain to a query surface even
			// when they mention it once. Values are Pagefind defaults unless noted.
			// See https://pagefind.app/docs/ranking/
			pagefind: {
				ranking: {
					termSimilarity: 6,
					termFrequency: 0.05,
					pageLength: 0.05,
					termSaturation: 2,
					metaWeights: { title: 5, keywords: 3 },
				},
			},
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/jamiegunn/ai_enablement_playbook',
				},
			],
			customCss: ['./src/styles/custom.css'],
			editLink: {
				baseUrl: 'https://github.com/jamiegunn/ai_enablement_playbook/edit/main/',
			},
			lastUpdated: true,
			pagination: true,
			plugins: [
				starlightBlog({
					title: 'Field Notes',
					postCount: 7,
					recentPostCount: 5,
					authors: {
						editor: {
							name: 'The Editor',
							title: 'AI Enablement Playbook',
						},
					},
				}),
			],
			sidebar: [
				{
					label: 'Start Here',
					items: [{ autogenerate: { directory: 'start' } }],
				},
				{
					label: 'Learning Paths',
					link: '/learning-paths/',
				},
				// The two initiatives are the reason the site exists, so they sit
				// directly under Start Here. Each is a self-contained playbook with
				// the same shape as the Autoscaling and Disruption playbooks on the
				// sister site: overview from zero → quick start → scenarios → the
				// deep pages → governance → one-page cheat sheet.
				{
					label: 'Knowledge Transfer Playbook',
					items: [{ autogenerate: { directory: 'kt' } }],
				},
				{
					label: 'Overnight QA Playbook',
					items: [{ autogenerate: { directory: 'overnight-qa' } }],
				},
				// Reference, not narrative: the Claude Code mechanics both playbooks
				// depend on, explained once here and linked from everywhere else.
				{
					label: 'Claude Code Toolkit',
					items: [{ autogenerate: { directory: 'toolkit' } }],
				},
				{
					label: 'Troubleshooting',
					items: [{ autogenerate: { directory: 'troubleshooting' } }],
				},
				{
					label: 'About & Methodology',
					link: '/about/',
				},
			],
		}),
	],
});
