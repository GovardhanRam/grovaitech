import type { NextConfig } from "next";
import fs from 'fs';
import path from 'path';

try {
  const p = path.join(process.cwd(), 'app', 'api', 'test-slice');
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
} catch {}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
