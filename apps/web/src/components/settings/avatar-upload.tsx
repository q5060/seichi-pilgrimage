"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

async function uploadAvatarViaForm(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("privacy", "private");

  const res = await fetch("/api/photos", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "上傳失敗");
  }
  const photo = await res.json();
  return photo.url as string;
}

async function uploadAvatar(file: File): Promise<string> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type || "image/jpeg",
      filename: file.name,
    }),
  });

  if (presignRes.status === 501) {
    return uploadAvatarViaForm(file);
  }

  if (!presignRes.ok) {
    const data = await presignRes.json();
    throw new Error(data.error ?? "無法取得上傳授權");
  }

  const { uploadUrl, key, contentType, publicUrl } = await presignRes.json();

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("上傳失敗");
  }

  return publicUrl ?? key;
}

export function AvatarUpload({
  name,
  image,
  fallbackImage,
  onImageChange,
}: {
  name: string;
  image: string | null;
  fallbackImage?: string | null;
  onImageChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const displayImage = image || fallbackImage || undefined;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadAvatar(file);
      onImageChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16">
        <AvatarImage src={displayImage} alt={name} />
        <AvatarFallback className="text-lg">{name?.[0] ?? "?"}</AvatarFallback>
      </Avatar>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "上傳中..." : "更換頭像"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
