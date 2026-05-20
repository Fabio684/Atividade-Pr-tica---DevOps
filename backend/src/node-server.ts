import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { InMemoryRepository } from "./infra/inMemoryRepository.js";
import { FirebaseRepository } from "./infra/firebaseRepository.js";

function createRepository() {
  const shouldUseFirebase =
    Boolean(process.env.FIREBASE_DATABASE_URL) && Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  if (shouldUseFirebase) {
    return new FirebaseRepository();
  }

  return new InMemoryRepository();
}

const app = createApp(createRepository());
const port = Number(process.env.PORT ?? 3000);

console.log(`Backend iniciado em http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
