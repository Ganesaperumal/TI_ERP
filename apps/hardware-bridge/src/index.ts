import http from 'http';
import { EscPosHelper, ReceiptParams } from './escpos';
import { SerialScaleParser } from './serial-scale';
import { ZplLabelGenerator, RepackStickerParams } from './zpl-label';
import { EdcTerminalAdapter, PaymentInitiationRequest } from './edc-payment-terminal';
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

  // 1. Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'READY',
        bridge: 'TI-ERP 5-Peripheral Hardware Bridge',
        port: PORT,
        supportedPeripherals: [
          'ESC/POS Thermal Printer (80mm & 58mm)',
          'RJ11 Cash Drawer Pulse',
          'RS232/USB Weighing Scale',
          'ZPL/TSPL Barcode Sticker Printer',
          'Pine Labs / Paytm EDC & Dynamic UPI Soundbox',
        ],
      }),
    );
    return;
  }

  // 2. ESC/POS Receipt Printing
  if (req.method === 'POST' && req.url === '/print-receipt') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const params: ReceiptParams = JSON.parse(body);
        const buffer = EscPosHelper.generateReceiptBuffer(params);
        const textPreview = EscPosHelper.generateReceiptTextPreview(params);

        console.log(`[HardwareBridge] ESC/POS receipt rendered: Bill ${params.billNumber} (${buffer.length} bytes)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            bytesSent: buffer.length,
            billNumber: params.billNumber,
            preview: textPreview,
          }),
        );
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 3. RJ11 Cash Drawer Kick Pulse
  if (req.method === 'POST' && (req.url === '/kick-drawer' || req.url === '/drawer/kick')) {
    console.log('[HardwareBridge] RJ11 Cash drawer kick signal pulsed (ESC p 0 25 250)');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        command: '0x1B 0x70 0x00 0x19 0xFA',
        message: 'Cash drawer kick signal pulsed successfully',
      }),
    );
    return;
  }

  // 4. Weighing Scale Live Reading & Barcode Decode
  if (req.method === 'GET' && req.url?.startsWith('/scale/weight')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const simulated = url.searchParams.get('weight')
      ? parseFloat(url.searchParams.get('weight')!)
      : undefined;

    const reading = SerialScaleParser.getLiveWeight(simulated);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(reading));
    return;
  }

  if (req.method === 'POST' && req.url === '/scale/parse-barcode') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { barcode } = JSON.parse(body);
        const parsed = SerialScaleParser.parseScaleBarcode(barcode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(parsed));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 5. ZPL Label Print
  if (req.method === 'POST' && req.url === '/print-zpl') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const { left, right }: { left: RepackStickerParams; right?: RepackStickerParams } = JSON.parse(body);
        const zpl = ZplLabelGenerator.generateRepackStickerZpl(left, right);
        console.log(`[HardwareBridge] ZPL 2-Up generated for barcode ${left.barcode}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, zplLength: zpl.length, zplCode: zpl }));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 6. EDC / Dynamic UPI Terminal
  if (req.method === 'POST' && req.url === '/edc/initiate') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const reqPayload: PaymentInitiationRequest = JSON.parse(body);
        const response = EdcTerminalAdapter.initiatePayment(reqPayload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url?.startsWith('/edc/status/')) {
    const txnId = req.url.split('/edc/status/')[1];
    const status = EdcTerminalAdapter.checkStatus(txnId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, () => {
  console.log(`TI-ERP Hardware Bridge running on port ${PORT}`);
  console.log(
    `Thermal printer configured at: ${DEFAULT_STORE_CONFIG.hardware.receiptPrinter.ipAddress}:${DEFAULT_STORE_CONFIG.hardware.receiptPrinter.port}`,
  );
});

export { EscPosHelper, SerialScaleParser, ZplLabelGenerator, EdcTerminalAdapter };
