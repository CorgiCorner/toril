import { createClient } from "@redis/client";

function withTimeout(promise, timeoutMs, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      const error = new Error("Redis command timed out.");
      error.code = "ETIMEDOUT";
      reject(error);
    }, timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function createRedisProbe({ redisUrl, prefix, scanLimit, timeoutMs }) {
  let client;

  const destroy = () => {
    if (client?.isOpen) client.destroy();
  };

  const command = (parts) => withTimeout(client.sendCommand(parts), timeoutMs, destroy);

  return {
    async connect() {
      client = createClient({
        url: redisUrl,
        disableClientInfo: true,
        socket: {
          connectTimeout: timeoutMs,
          reconnectStrategy: false,
        },
      });
      client.on("error", () => {});
      await withTimeout(client.connect(), timeoutMs, destroy);
    },

    ping() {
      return command(["PING"]);
    },

    serverInfo() {
      return command(["INFO", "server"]);
    },

    clusterInfo() {
      return command(["INFO", "cluster"]);
    },

    async maxmemoryPolicy() {
      const response = await command(["CONFIG", "GET", "maxmemory-policy"]);
      if (response && typeof response === "object" && !Array.isArray(response)) {
        return response["maxmemory-policy"] === undefined
          ? undefined
          : String(response["maxmemory-policy"]);
      }
      if (!Array.isArray(response) || response.length < 2) return undefined;
      return String(response[1]);
    },

    async scan() {
      const keys = [];
      let cursor = "0";
      do {
        const response = await command([
          "SCAN",
          cursor,
          "MATCH",
          `${prefix}:*`,
          "COUNT",
          "100",
        ]);
        if (!Array.isArray(response) || response.length !== 2 || !Array.isArray(response[1])) {
          throw new Error("Unexpected SCAN response.");
        }
        cursor = String(response[0]);
        for (const key of response[1]) {
          if (keys.length === scanLimit) return { keys, limited: true };
          keys.push(String(key));
        }
      } while (cursor !== "0");
      return { keys, limited: false };
    },

    destroy,
  };
}
