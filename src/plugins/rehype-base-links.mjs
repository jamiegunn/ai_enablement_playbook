/**
 * Rehype plugin that prefixes the site base path onto root-relative links in
 * markdown/MDX content (e.g. `/kt/quick-start/` →
 * `/ai_enablement_playbook/kt/quick-start/`).
 *
 * Starlight does not do this automatically, and relative links break whenever
 * a page is visited without a trailing slash. With this plugin, content is
 * authored with root-relative links and the base is applied at build time —
 * so changing `base` in astro.config.mjs never requires touching content.
 */
export function rehypeBaseLinks(base) {
	const prefix = base.replace(/\/+$/, '');

	function walk(node, fn) {
		fn(node);
		if (node.children) for (const child of node.children) walk(child, fn);
	}

	return () => (tree) => {
		walk(tree, (node) => {
			if (node.type !== 'element' || node.tagName !== 'a') return;
			const href = node.properties?.href;
			if (
				typeof href === 'string' &&
				href.startsWith('/') &&
				!href.startsWith('//') &&
				href !== prefix &&
				!href.startsWith(prefix + '/')
			) {
				node.properties.href = prefix + href;
			}
		});
	};
}
