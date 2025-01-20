export function asObjectSafe(value: any): object {
  if (value == null)
    return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as object;
    }
    catch {
      return {};
    }
  }
  if (typeof value === "object") {
    return { ...value } as object;
  }
  return {};
}
