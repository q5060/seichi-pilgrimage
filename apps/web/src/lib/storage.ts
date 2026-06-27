import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export interface SavedImage {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

interface StorageProvider {
  saveImage(
    buffer: Buffer,
    filename: string
  ): Promise<SavedImage>;
  getPresignedUploadUrl?(
    key: string,
    contentType: string,
    expiresIn?: number
  ): Promise<string>;
  finalizeDirectUpload?(key: string): Promise<SavedImage>;
}

function getS3Credentials() {
  return {
    accessKeyId:
      process.env.S3_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey:
      process.env.S3_SECRET_ACCESS_KEY ?? process.env.S3_SECRET_KEY ?? "",
  };
}

function isS3Configured(): boolean {
  const { accessKeyId, secretAccessKey } = getS3Credentials();
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_BUCKET &&
      accessKeyId &&
      secretAccessKey
  );
}

function publicUrlForKey(key: string): string {
  const base = (process.env.S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  return `${base}/${key}`;
}

export function getPublicUrlForKey(key: string): string {
  return publicUrlForKey(key);
}

export function isDirectUploadEnabled(): boolean {
  return isS3Configured();
}

async function processImage(buffer: Buffer, filename: string) {
  const id = uuidv4();
  const ext = path.extname(filename) || ".jpg";
  const baseName = `${id}${ext}`;
  const thumbName = `${id}_thumb.webp`;

  const metadata = await sharp(buffer).metadata();
  const thumbBuffer = await sharp(buffer)
    .resize(400, 400, { fit: "inside" })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    baseName,
    thumbName,
    buffer,
    thumbBuffer,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    contentType: ext === ".png" ? "image/png" : "image/jpeg",
    thumbContentType: "image/webp",
  };
}

class LocalStorageProvider implements StorageProvider {
  async saveImage(buffer: Buffer, filename: string): Promise<SavedImage> {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const processed = await processImage(buffer, filename);

    await writeFile(path.join(UPLOAD_DIR, processed.baseName), processed.buffer);
    await writeFile(path.join(UPLOAD_DIR, processed.thumbName), processed.thumbBuffer);

    return {
      url: `/api/uploads/${processed.baseName}`,
      thumbnailUrl: `/api/uploads/${processed.thumbName}`,
      width: processed.width,
      height: processed.height,
    };
  }
}

class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET!;
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: "auto",
      credentials: getS3Credentials(),
      forcePathStyle: true,
    });
  }

  async saveImage(buffer: Buffer, filename: string): Promise<SavedImage> {
    const processed = await processImage(buffer, filename);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: processed.baseName,
        Body: processed.buffer,
        ContentType: processed.contentType,
      })
    );
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: processed.thumbName,
        Body: processed.thumbBuffer,
        ContentType: processed.thumbContentType,
      })
    );

    return {
      url: publicUrlForKey(processed.baseName),
      thumbnailUrl: publicUrlForKey(processed.thumbName),
      width: processed.width,
      height: processed.height,
    };
  }

  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600
  ): Promise<string> {
    const commandInput: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    };
    return getSignedUrl(this.client, new PutObjectCommand(commandInput), {
      expiresIn,
    });
  }

  async finalizeDirectUpload(key: string): Promise<SavedImage> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) throw new Error("無法讀取上傳檔案");

    const buffer = Buffer.from(bytes);
    const ext = path.extname(key) || ".jpg";
    const thumbName = key.replace(ext, `_thumb.webp`);

    const metadata = await sharp(buffer).metadata();
    const thumbBuffer = await sharp(buffer)
      .resize(400, 400, { fit: "inside" })
      .webp({ quality: 80 })
      .toBuffer();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbName,
        Body: thumbBuffer,
        ContentType: "image/webp",
      })
    );

    return {
      url: publicUrlForKey(key),
      thumbnailUrl: publicUrlForKey(thumbName),
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    };
  }
}

let provider: StorageProvider | null = null;

function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider = isS3Configured()
      ? new S3StorageProvider()
      : new LocalStorageProvider();
  }
  return provider;
}

export async function saveUploadedImage(
  buffer: Buffer,
  filename: string
): Promise<SavedImage> {
  return getStorageProvider().saveImage(buffer, filename);
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn?: number
): Promise<string | null> {
  const storage = getStorageProvider();
  if (!storage.getPresignedUploadUrl) return null;
  return storage.getPresignedUploadUrl(key, contentType, expiresIn);
}

export async function finalizeDirectUpload(key: string): Promise<SavedImage> {
  const storage = getStorageProvider();
  if (!storage.finalizeDirectUpload) {
    throw new Error("直傳儲存未設定");
  }
  return storage.finalizeDirectUpload(key);
}
