import { startTunnel } from 'untun';

async function main() {
  const tunnel = await startTunnel({
    port: 3000,
    acceptCloudflareNotice: true,
  });

  const url = await tunnel.getURL();
  console.log('Tunnel Active!');
  console.log(`Public URL: ${url}`);
}

main().catch((err) => {
  console.error('Failed to start tunnel:', err);
  process.exit(1);
});
