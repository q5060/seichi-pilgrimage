export function isDevCredentialsEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEV_CREDENTIALS === "true"
  );
}

export function isDevLoginUiEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === "true"
  );
}
