import { describe, it, expect } from 'vitest';
import { rewriteHtml, rewriteUrl } from '../src/html-rewriter';

describe('HTML Rewriter', () => {
	describe('rewriteUrl', () => {
		const targetOrigin = 'https://example.com';
		const baseUrl = 'https://example.com/page';

		it('passes through data URLs unchanged', () => {
			expect(rewriteUrl('data:image/png;base64,abc', targetOrigin, baseUrl)).toBe('data:image/png;base64,abc');
		});

		it('passes through blob URLs unchanged', () => {
			expect(rewriteUrl('blob:https://example.com/uuid', targetOrigin, baseUrl)).toBe('blob:https://example.com/uuid');
		});

		it('rewrites absolute URLs with http', () => {
			const result = rewriteUrl('https://cdn.example.com/image.png', targetOrigin, baseUrl);
			expect(result).toContain('/proxy/');
			expect(result).toContain('cdn.example.com');
		});

		it('rewrites root-relative URLs', () => {
			const result = rewriteUrl('/static/app.js', targetOrigin, baseUrl);
			expect(result).toContain('/proxy/');
			expect(result).toContain('example.com');
			expect(result).toContain('/static/app.js');
		});

		it('rewrites protocol-relative URLs', () => {
			const result = rewriteUrl('//cdn.example.com/image.png', targetOrigin, baseUrl);
			expect(result).toContain('/proxy/');
			expect(result).toContain('cdn.example.com');
		});

		it('rewrites relative URLs', () => {
			const result = rewriteUrl('./image.png', targetOrigin, baseUrl);
			expect(result).toContain('/proxy/');
			expect(result).toContain('example.com');
		});
	});

	describe('rewriteHtml', () => {
		const options = {
			baseUrl: 'https://example.com/index.html',
			targetOrigin: 'https://example.com',
		};

		it('rewrites script src attributes', () => {
			const html = '<html><head><script src="/js/app.js"></script></head></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/js/app.js');
		});

		it('rewrites link href attributes', () => {
			const html = '<html><head><link href="/css/style.css" rel="stylesheet"></head></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/css/style.css');
		});

		it('rewrites img src attributes', () => {
			const html = '<html><body><img src="/images/logo.png"></body></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/images/logo.png');
		});

		it('rewrites img srcset attributes', () => {
			const html = '<html><body><img src="/img.png" srcset="/img-2x.png 2x, /img-3x.png 3x"></body></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/img-2x.png');
			expect(result).toContain('/proxy/https://example.com/img-3x.png');
		});

		it('rewrites iframe src attributes', () => {
			const html = '<html><body><iframe src="/embed/video"></iframe></body></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/embed/video');
		});

		it('rewrites video poster attribute', () => {
			const html = '<html><body><video poster="/thumb.png"></video></body></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/thumb.png');
		});

		it('rewrites CSS url() in style attributes', () => {
			const html = '<html><body><div style="background-image: url(/bg.png)"></div></body></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/bg.png');
		});

		it('does not rewrite URLs with data:', () => {
			const html = '<html><body><img src="data:image/gif;base64,Rg=="></body></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('data:image/gif;base64,Rg==');
			expect(result).not.toContain('/proxy/');
		});

		it('handles multiple elements', () => {
			const html = `
				<html>
				<head>
					<link href="/style.css" rel="stylesheet">
					<script src="/app.js"></script>
				</head>
				<body>
					<img src="/img.png">
					<div style="background: url(/bg.jpg)"></div>
				</body>
				</html>
			`;
			const result = rewriteHtml(html, options);
			expect(result).toContain('/proxy/https://example.com/style.css');
			expect(result).toContain('/proxy/https://example.com/app.js');
			expect(result).toContain('/proxy/https://example.com/img.png');
			expect(result).toContain('/proxy/https://example.com/bg.jpg');
		});

		it('preserves other HTML attributes', () => {
			const html = '<html><body><img src="/img.png" alt="test" class="logo" id="main-img"></body></html>';
			const result = rewriteHtml(html, options);
			expect(result).toContain('alt="test"');
			expect(result).toContain('class="logo"');
			expect(result).toContain('id="main-img"');
		});
	});
});
