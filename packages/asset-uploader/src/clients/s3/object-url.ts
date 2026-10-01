import { extendedEncodeURIComponent } from "../../utils/sanitize-s3-key";

/**
 * Builds a path-style object address: `<endpoint><path prefix>/<bucket>/<key>`.
 *
 * Keeps any path on the endpoint (for example Supabase's
 * `https://<ref>.supabase.co/storage/v1/s3`). Resolving an absolute `/bucket/key`
 * against the endpoint would silently drop that prefix.
 */
export const createS3ObjectUrl = ({
  endpoint,
  bucket,
  key,
}: {
  endpoint: string;
  bucket: string;
  key: string;
}) => {
  const url = new URL(endpoint);
  const prefix = url.pathname.replace(/\/+$/, "");
  url.pathname = `${prefix}/${bucket}/${extendedEncodeURIComponent(key)}`;
  url.search = "";
  url.hash = "";
  return url;
};
