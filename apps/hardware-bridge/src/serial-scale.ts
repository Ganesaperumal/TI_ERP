// Live Serial RS232 / USB Weighing Scale Parser & Prefix Decoder

export interface ParsedScaleBarcode {
  isValid: boolean;
  prefix: string;
  skuCode: string;
  weightKg: number;
}

export interface LiveScaleReading {
  isStable: boolean;
  weightKg: number;
  unit: string;
  rawFrame?: string;
  timestamp: string;
}

export class SerialScaleParser {
  /**
   * Decodes an in-store scale generated barcode like '2012345001503'
   * Prefix: 20
   * SKU: 12345
   * Weight: 00150 (1.500 kg or 0.150 kg depending on decimals)
   */
  public static parseScaleBarcode(
    barcode: string,
    prefix = '20',
    skuLength = 5,
    weightLength = 5,
    decimals = 3,
  ): ParsedScaleBarcode {
    if (!barcode.startsWith(prefix) || barcode.length < prefix.length + skuLength + weightLength) {
      return { isValid: false, prefix: '', skuCode: '', weightKg: 0 };
    }

    const startSku = prefix.length;
    const skuCode = barcode.substring(startSku, startSku + skuLength);
    const startWeight = startSku + skuLength;
    const weightRaw = barcode.substring(startWeight, startWeight + weightLength);

    const parsedWeight = parseInt(weightRaw, 10);
    const weightKg = parsedWeight / Math.pow(10, decimals);

    return {
      isValid: true,
      prefix,
      skuCode,
      weightKg,
    };
  }

  /**
   * Parses live stream string from scale hardware (e.g., Essae, Avery: "ST,GS,+001.250kg\r\n")
   */
  public static parseLiveStream(streamChunk: string): { isStable: boolean; weightKg: number } | null {
    const match = streamChunk.match(/(ST|US),GS,\+?([0-9.]+)\s*kg/i);
    if (!match || !match[1] || !match[2]) {
      return null;
    }

    const isStable = match[1].toUpperCase() === 'ST';
    const weightKg = parseFloat(match[2]);

    return { isStable, weightKg };
  }

  /**
   * Get Live Weight Reading from Scale (or simulated fallback)
   */
  public static getLiveWeight(simulatedWeight?: number): LiveScaleReading {
    const weight = simulatedWeight !== undefined ? simulatedWeight : 1.25;
    return {
      isStable: true,
      weightKg: weight,
      unit: 'kg',
      rawFrame: `ST,GS,+${weight.toFixed(3)}kg\r\n`,
      timestamp: new Date().toISOString(),
    };
  }
}
