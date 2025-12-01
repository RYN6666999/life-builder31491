import type { VercelRequest, VercelResponse } from "@vercel/node";
import app, { initializeApp } from "../server/app";

let initialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!initialized) {
    await initializeApp();
    initialized = true;
  }
  
  return app(req, res);
}
