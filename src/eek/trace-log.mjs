import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function createTraceLogger(traceFile) {
  const file = path.resolve(traceFile);
  await mkdir(path.dirname(file), { recursive: true });

  return {
    file,
    async record(phase, details = {}) {
      const event = { at: new Date().toISOString(), phase, ...details };
      await appendFile(file, `${JSON.stringify(event)}\n`, "utf8");
      return event;
    }
  };
}
