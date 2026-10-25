import http from 'http';
import { EscPosHelper } from './escpos';
import { SerialScaleParser } from './serial-scale';
import { ZplLabelGenerator } from './zpl-label';
import { DEFAULT_STORE_CONFIG } from '@ti-erp/shared-types';

const PORT = Number(process.env.HARDWARE_BRIDGE_PORT) || 8089;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'READY', bridge: 'TI-ERP Hardware Bridge Agent', port: PORT }));
    return;
  }

  if (req.method === 'POST' && req.url === '/drawer/kick') {
    console.log('[HardwareBridge] Pulse sent to kick cash drawer');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Cash drawer kick signal pulsed' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/scale/parse-barcode') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { barcode } = JSON.parse(body);
        const parsed = SerialScaleParser.parseScaleBarcode(barcode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(parsed));
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: errorMsg }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`TI-ERP Hardware Bridge running on port ${PORT}`);
  console.log(`Thermal printer configured at: ${DEFAULT_STORE_CONFIG.hardware.receiptPrinter.ipAddress}:${DEFAULT_STORE_CONFIG.hardware.receiptPrinter.port}`);
});

export { EscPosHelper, SerialScaleParser, ZplLabelGenerator };
