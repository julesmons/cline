export function extractMessageFromThrow(error: unknown): string {

  // 1. If the error is null, return "Unknown error"
  if (error == null) {
    return "Unknown error";
  }

  // 2. If the error is an instance of Error or an object with a message property, return the error message
  if (error instanceof Error || (typeof error === "object" && "message" in error)) {

    return (
      error.message != null
        ? String(error.message)
        : "Unknown error"
    );
  }

  // 3. Try to convert the error to a string anyway and return it.
  return String(error) || "Unknown error";
}

export function extractExceptionFromThrow(error: unknown): Error {

  // 1. If the error is an instance of Error, return it
  if (error instanceof Error) {
    return error;
  }

  // 2. Return a new Error instance with the stringified error as the message
  return new Error(String(error));
}
