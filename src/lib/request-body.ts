/** Raised when a request body is larger than the allowed size. */
export class BodyTooLargeError extends Error {}

/**
 * Reads a request body as JSON, refusing bodies over maxBytes. The size is checked as the
 * body streams in, so a client that omits or lies about Content-Length still cannot force
 * the server to buffer more than the limit.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError();

  if (!request.body) return JSON.parse("");

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new BodyTooLargeError();
    }
    text += decoder.decode(value, { stream: true });
  }

  return JSON.parse(text + decoder.decode());
}
