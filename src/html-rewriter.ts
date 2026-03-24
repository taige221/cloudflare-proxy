const PROXY_BASE = '/proxy';
const PROXY_PARAM = 'url';

interface RewriteOptions {
	baseUrl: string;
	targetOrigin: string;
}

export function rewriteHtml(html: string, options: RewriteOptions): string {
	const { baseUrl, targetOrigin } = options;

	let result = html;

	result = rewriteAttr(result, 'src', ['script', 'img', 'source', 'track', 'video', 'audio', 'iframe', 'embed', 'object', 'area'], targetOrigin, baseUrl);

	result = rewriteAttr(result, 'href', ['link', 'a', 'area'], targetOrigin, baseUrl);

	result = rewriteSrcset(result, targetOrigin, baseUrl);

	result = rewriteAttr(result, 'poster', ['video'], targetOrigin, baseUrl);

	result = rewriteInlineStyle(result, targetOrigin, baseUrl);

	result = processBaseTag(result, baseUrl);

	return result;
}

function rewriteSrcset(html: string, targetOrigin: string, baseUrl: string): string {
	const srcsetPattern = /<img([^>]*)srcset\s*=\s*["']([^"']*)["']([^>]*)>/gi;

	return html.replace(srcsetPattern, (match, prefix, srcsetValue, suffix) => {
		const rewrittenSrcset = rewriteSrcsetValue(srcsetValue, targetOrigin, baseUrl);
		return `<img${prefix}srcset="${rewrittenSrcset}"${suffix}>`;
	});
}

function rewriteSrcsetValue(srcset: string, targetOrigin: string, baseUrl: string): string {
	const parts = srcset.split(',');

	const rewrittenParts = parts.map((part) => {
		const trimmed = part.trim();
		const urlAndDescriptor = trimmed.split(/\s+/);
		const url = urlAndDescriptor[0];
		const descriptor = urlAndDescriptor.slice(1).join(' ');

		const rewrittenUrl = rewriteUrl(url, targetOrigin, baseUrl);

		if (descriptor) {
			return `${rewrittenUrl} ${descriptor}`;
		}
		return rewrittenUrl;
	});

	return rewrittenParts.join(', ');
}

function rewriteAttr(
	html: string,
	attr: string,
	tags: string[],
	targetOrigin: string,
	baseUrl: string
): string {
	const tagPattern = new RegExp(
		`<(${tags.join('|')})([^>]*)(${attr})\\s*=\\s*["']([^"']*)["']([^>]*)>`,
		'gi'
	);

	return html.replace(tagPattern, (match, tag, prefix, attrName, value, suffix) => {
		const rewrittenUrl = rewriteUrl(value, targetOrigin, baseUrl);
		return `<${tag}${prefix}${attr}="${rewrittenUrl}"${suffix}>`;
	});
}

function rewriteInlineStyle(html: string, targetOrigin: string, baseUrl: string): string {
	const stylePattern = /style\s*=\s*["']([^"']*)["']/gi;
	return html.replace(stylePattern, (match, styleContent) => {
		const rewritten = rewriteCssUrls(styleContent, targetOrigin, baseUrl);
		return `style="${rewritten}"`;
	});
}

function rewriteCssUrls(style: string, targetOrigin: string, baseUrl: string): string {
	const urlPattern = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
	return style.replace(urlPattern, (match, url) => {
		const rewrittenUrl = rewriteUrl(url.trim(), targetOrigin, baseUrl);
		return `url(${rewrittenUrl})`;
	});
}

function processBaseTag(html: string, baseUrl: string): string {
	const baseTagPattern = /<base([^>]*)>/gi;
	let hasBaseTag = false;
	let customBase = '';

	html = html.replace(baseTagPattern, (match, attrs) => {
		hasBaseTag = true;
		const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
		if (hrefMatch) {
			customBase = hrefMatch[1];
		}
		return '';
	});

	if (hasBaseTag && customBase) {
		const effectiveBase = new URL(customBase, baseUrl).toString();
		html = `<base href="${effectiveBase}">` + html;
	}

	return html;
}

export function rewriteUrl(url: string, targetOrigin: string, baseUrl: string): string {
	if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
		return url;
	}

	try {
		let targetFullUrl: string;

		if (url.startsWith('//')) {
			const withProtocol = `${new URL(baseUrl).protocol}${url}`;
			targetFullUrl = withProtocol;
		} else if (url.startsWith('/')) {
			targetFullUrl = `${targetOrigin}${url}`;
		} else if (url.startsWith('http://') || url.startsWith('https://')) {
			targetFullUrl = url;
		} else {
			const resolved = new URL(url, baseUrl);
			targetFullUrl = `${resolved.protocol}//${resolved.host}${resolved.pathname}${resolved.search}`;
		}

		return `${PROXY_BASE}?${PROXY_PARAM}=${encodeURIComponent(targetFullUrl)}`;
	} catch {
		return url;
	}
}
