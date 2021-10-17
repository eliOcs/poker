import { randomBytes } from "crypto";

async function generateId() {
  return new Promise((res, rej) => {
    randomBytes(16, (err, buf) => {
      if (err) return rej(err);
      res(buf.toString("hex"));
    });
  });
}

export async function create() {
  return { id: await generateId() };
}
