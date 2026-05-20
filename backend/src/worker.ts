import { createApp } from "./app.js";
import { InMemoryRepository } from "./infra/inMemoryRepository.js";

const app = createApp(new InMemoryRepository());

export default app;
