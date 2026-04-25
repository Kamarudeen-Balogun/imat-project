import os from "os";
import net from "net";
import path from "path";
import { spawn } from "child_process";

const interfaces = os.networkInterfaces();

const isGoodIPv4 = (addr) => {
  if (!addr || addr.family !== "IPv4" || addr.internal) return false;
  if (addr.address.startsWith("169.254.")) return false;
  return true;
};

const isVirtualName = (name) => /vethernet|virtual|hyper-v|vmware|docker|loopback|wsl|bluetooth/i.test(name);
const isWifiName = (name) => /wi-?fi|wireless|wlan/i.test(name);

const candidates = Object.entries(interfaces)
  .flatMap(([name, addrs]) => (addrs || []).map((addr) => ({ name, addr })))
  .filter(({ name, addr }) => isGoodIPv4(addr) && !isVirtualName(name));

const wifiCandidate = candidates.find(({ name }) => isWifiName(name));
const fallbackCandidate = candidates[0];
const lanHost = wifiCandidate?.addr.address || fallbackCandidate?.addr.address || "127.0.0.1";
const bindHost = process.env.NEXT_DEV_HOST || "0.0.0.0";
const basePort = Number(process.env.PORT || 3001);

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.unref();
    server.once("error", () => resolve(false));
    server.listen({ host: bindHost, port }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function pickPort(startPort) {
  for (let currentPort = startPort; currentPort < startPort + 50; currentPort += 1) {
    // Pick the first available port at or above the requested one.
    // This keeps localhost and LAN access aligned on the same port.
    if (await isPortFree(currentPort)) {
      return currentPort;
    }
  }

  throw new Error(`No free port found starting from ${startPort}`);
}

const port = await pickPort(basePort);
const allowedDevOrigins = [...new Set(candidates.map(({ addr }) => addr.address))];

console.log(`\nLocal URL: http://localhost:${port}`);
console.log(`LAN dev URL: http://${lanHost}:${port}`);
if (port !== basePort) {
  console.log(`Port ${basePort} was busy, so the dev server moved to ${port}.`);
}
console.log("To override bind host, set NEXT_DEV_HOST before npm run dev.\n");

const nextBin = path.resolve(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const useTurbopack = process.env.NEXT_DEV_USE_TURBOPACK === "1";
const args = [
  nextBin,
  "dev",
  "--hostname",
  bindHost,
  "--port",
  String(port),
  ...(useTurbopack ? [] : ["--webpack"]),
  ...process.argv.slice(2),
];

if (!useTurbopack) {
  console.log("Using webpack dev server mode (set NEXT_DEV_USE_TURBOPACK=1 to opt into Turbopack).\n");
}

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_ALLOWED_DEV_ORIGINS: [...allowedDevOrigins, "localhost", "127.0.0.1"].join(","),
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
