import { randomBytes } from "crypto";

export async function create() {
  return { id: randomBytes(16).toString("hex") };
}
