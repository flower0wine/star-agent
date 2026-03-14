
import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from "@mastra/observability";
import { weatherWorkflow } from "./workflows/weather-workflow";
import { weatherAgent } from "./agents/weather-agent";
import { starAgent } from "./agents/star-agent";

// Only create LibSQL store in Node.js environment (not during Next.js build)
function createStorage() {
  if (typeof window === "undefined") {
    return new LibSQLStore({
      id: "mastra-storage",
      url: "file:./mastra.db",
    });
  }
  return undefined;
}

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { weatherAgent, starAgent },
  storage: createStorage(),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "mastra",
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(),
        ],
      },
    },
  }),
});
