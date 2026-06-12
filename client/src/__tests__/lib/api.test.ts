import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Must mock fetch before importing api so the module picks up the mock
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to set up a fetch mock response
function mockResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

beforeEach(() => {
  localStorage.clear();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api request helper', () => {
  it('sends Authorization header from localStorage token', async () => {
    localStorage.setItem('token', 'my-token');
    mockResponse({ ok: true });

    const { api } = await import('../../lib/api');
    await api.get('/api/health');

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
      })
    );
  });

  it('throws on non-2xx responses with the error message from body', async () => {
    mockResponse({ error: 'Not found' }, 404);
    const { api } = await import('../../lib/api');
    await expect(api.get('/api/missing')).rejects.toThrow('Not found');
  });

  it('sends JSON body on POST', async () => {
    mockResponse({ id: 1 });
    const { api } = await import('../../lib/api');
    await api.post('/api/tests', { title: 'Quiz' });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/api/tests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Quiz' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );
  });
});
