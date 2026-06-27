async function uploadImageFile(file: File): Promise<string> {
  const presignRes = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type || "image/jpeg",
      filename: file.name,
    }),
  });

  if (presignRes.ok) {
    const { uploadUrl, key, contentType, publicUrl } = await presignRes.json();
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!putRes.ok) throw new Error("直傳至儲存空間失敗");

    const confirmRes = await fetch("/api/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storageKey: key }),
    });
    if (confirmRes.ok) {
      const photo = await confirmRes.json();
      return photo.url ?? publicUrl;
    }
    return publicUrl;
  }

  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/photos", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "上傳失敗");
  }
  const photo = await res.json();
  return photo.url;
}

export { uploadImageFile };
