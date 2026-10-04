export function getSafePostAuthPath(requestedPath: string | null): string {
  if (
    requestedPath &&
    requestedPath.startsWith("/") &&
    !requestedPath.startsWith("//") &&
    !requestedPath.startsWith("/\\") &&
    !requestedPath.startsWith("/login") &&
    !requestedPath.startsWith("/register")
  ) {
    return requestedPath;
  }

  return "/dashboard";
}
