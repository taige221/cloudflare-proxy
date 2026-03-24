import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker from '../src';

describe('Proxy Worker', () => {
	describe('route matching', () => {
		it('returns 404 for non-proxy paths', async () => {
			const request = new Request('http://example.com/message');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(404);
		});

		it('returns 404 for root path', async () => {
			const request = new Request('http://example.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(404);
		});
	});

	describe('URL validation', () => {
		it('returns 400 for invalid URL after /proxy/', async () => {
			const request = new Request('http://example.com/proxy/not-a-valid-url');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(400);
		});

		it('returns 400 for non-HTTP protocol', async () => {
			const request = new Request('http://example.com/proxy/ftp://example.com/file');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(400);
			const text = await response.text();
			expect(text).toContain('Unsupported protocol');
		});

		it('returns 400 for javascript protocol', async () => {
			const request = new Request('http://example.com/proxy/javascript:alert(1)');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(400);
		});
	});

	describe('CORS handling', () => {
		it('returns CORS headers in response', async () => {
			const request = new Request('http://example.com/proxy/https://example.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
		});

		it('handles OPTIONS preflight request', async () => {
			const request = new Request('http://example.com/proxy/https://example.com/', {
				method: 'OPTIONS',
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(204);
		});
	});

	describe('header filtering', () => {
		it('filters out blocked headers from request', async () => {
			const request = new Request('http://example.com/proxy/https://example.com/', {
				headers: {
					host: 'example.com',
					'cf-ray': 'abc123',
					'x-forwarded-for': '1.2.3.4',
					'content-length': '100',
					'user-agent': 'TestAgent/1.0',
				},
			});
			const ctx = createExecutionContext();
			await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
		});

		it('filters out blocked response headers', async () => {
			const request = new Request('http://example.com/proxy/https://example.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.headers.has('transfer-encoding')).toBe(false);
			expect(response.headers.has('content-encoding')).toBe(false);
		});
	});

	describe('error handling', () => {
		it('returns 502 for failed proxy request', async () => {
			const request = new Request('http://example.com/proxy/https://invalid-domain-that-does-not-exist-12345.com/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(502);
			const text = await response.text();
			expect(text).toContain('Proxy request failed');
		});

		it('returns 400 for empty proxy path', async () => {
			const request = new Request('http://example.com/proxy/');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).toBe(400);
		});
	});

	describe('URL encoding', () => {
		it('correctly decodes encoded URLs', async () => {
			const request = new Request('http://example.com/proxy/https%3A%2F%2Fexample.com%2Fpath%20with%20spaces');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			expect(response.status).not.toBe(400);
		});

		it('preserves query parameters', async () => {
			const request = new Request('http://example.com/proxy/https://example.com/?foo=bar&baz=qux');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
		});
	});
});
