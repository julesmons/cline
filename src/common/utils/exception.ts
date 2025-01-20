export function extractMessageFromThrow(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function extractExceptionFromThrow(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
}
