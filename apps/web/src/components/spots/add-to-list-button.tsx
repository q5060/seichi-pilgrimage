"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/require-auth-client";
import { ListPlus } from "lucide-react";

interface ListSummary {
  id: string;
  title: string;
}

export function AddToListButton({
  spotId,
  anilistId,
  iconOnly = false,
}: {
  spotId?: string;
  anilistId?: number;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const { requireAuth, isLoggedIn, status } = useRequireAuth();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const itemPayload = spotId
    ? { spotId }
    : anilistId != null
      ? { anilistId }
      : null;

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/lists")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLists(data);
      });
  }, [isLoggedIn]);

  async function addToList(listId: string) {
    if (!requireAuth() || !itemPayload) return;
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/lists/${listId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addItem: itemPayload }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("已加入清單");
      setOpen(false);
    } else {
      const data = await res.json();
      setMessage(data.error ?? "加入失敗");
    }
  }

  async function createAndAdd() {
    if (!requireAuth() || !itemPayload) return;
    const title = prompt("新清單名稱");
    if (!title?.trim()) return;
    setLoading(true);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), items: [itemPayload] }),
    });
    setLoading(false);
    if (res.ok) {
      setMessage("已建立清單並加入");
      setOpen(false);
      router.refresh();
    }
  }

  if (!itemPayload) return null;

  if (status === "loading") return null;

  if (!isLoggedIn) {
    if (iconOnly) {
      return (
        <button
          type="button"
          onClick={() => router.push("/auth/signin")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/50 backdrop-blur-xl"
          aria-label="登入以加入清單"
        >
          <ListPlus className="h-4 w-4" />
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => router.push("/auth/signin")}
        className="btn-secondary w-full text-sm"
      >
        <ListPlus className="mr-2 h-4 w-4" />
        登入以加入清單
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={
          iconOnly
            ? "inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface/50 backdrop-blur-xl"
            : "btn-secondary w-full text-sm"
        }
        aria-label={iconOnly ? "加入清單" : undefined}
      >
        <ListPlus className={iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4"} />
        {!iconOnly && "加入清單"}
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-10 mb-2 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
          {lists.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">尚無清單</p>
          ) : (
            lists.map((list) => (
              <button
                key={list.id}
                type="button"
                onClick={() => addToList(list.id)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-elevated"
              >
                {list.title}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={createAndAdd}
            className="mt-1 block w-full rounded-lg border-t border-border px-3 py-2 text-left text-sm text-primary hover:bg-elevated"
          >
            + 建立新清單
          </button>
        </div>
      )}
      {message && !iconOnly && <p className="mt-1 text-xs text-primary">{message}</p>}
    </div>
  );
}
