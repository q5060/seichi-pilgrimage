"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-TW">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "#0d1118",
          color: "#e6edf3",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>發生嚴重錯誤</h2>
          <p style={{ color: "#8b949e", fontSize: "0.875rem" }}>
            應用程式無法繼續運作，請重新整理頁面。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#6d9ec4",
              color: "#0d1118",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            重試
          </button>
        </div>
      </body>
    </html>
  );
}
