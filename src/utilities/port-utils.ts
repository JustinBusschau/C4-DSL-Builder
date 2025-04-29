import net from 'net';

export async function findAvailablePort(preferredPort: number): Promise<number> {
  let port = preferredPort;

  while (true) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port += 1; // Try next port
  }
}

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        server.close();
        resolve(true);
      })
      .listen(port);
  });
}
