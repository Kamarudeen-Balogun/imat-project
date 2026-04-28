export function optimizeCloudinaryUrl(url: string, opts?: { width?: number | 'auto' | string }) {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const width = opts?.width ?? 'auto';
  const transformation = `f_auto,q_auto,w_${width},c_limit,dpr_auto`;

  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;

  const prefix = url.slice(0, idx + marker.length);
  const rest = url.slice(idx + marker.length);

  // Avoid double-inserting if already transformed
  if (rest.startsWith(transformation) || rest.startsWith('f_auto')) return url;

  return `${prefix}${transformation}/${rest}`;
}

export default optimizeCloudinaryUrl;
