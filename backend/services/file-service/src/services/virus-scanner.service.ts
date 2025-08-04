import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const NodeClam = require('clamscan');

export interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  file?: string;
  goodFiles?: string[];
  badFiles?: string[];
}

@Injectable()
export class VirusScannerService implements OnModuleInit {
  private readonly logger = new Logger(VirusScannerService.name);
  private clamscan: any = null;
  private isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isEnabled = this.configService.get<boolean>('VIRUS_SCAN_ENABLED', false);
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      
      return;
    }

    try {
      await this.initializeClamScan();
   
    } catch (error) {
    
    
      this.isEnabled = false;
    }
  }

  private async initializeClamScan(): Promise<void> {
    const clamScanOptions = {
      removeInfected: false, // Don't automatically remove infected files
      quarantineInfected: false, // Don't quarantine
      scanLog: null, // Disable logging to file
      debugMode: this.configService.get<string>('NODE_ENV') === 'development',
      fileList: null,
      scanRecursively: false,
      clamscan: {
        path: this.configService.get<string>('CLAMSCAN_PATH', '/usr/bin/clamscan'),
        db: this.configService.get<string>('CLAMSCAN_DB_PATH', '/var/lib/clamav'),
        scanArchives: true,
        active: false, // Disable clamscan binary, prefer clamdscan
      },
      clamdscan: {
        socket: this.configService.get<string>('CLAMD_SOCKET') || null,
        host: this.configService.get<string>('CLAMD_HOST', 'localhost'),
        port: parseInt(this.configService.get<string>('CLAMD_PORT', '3310'), 10),
        timeout: parseInt(this.configService.get<string>('CLAMD_TIMEOUT', '60000'), 10),
        localFallback: false, // Don't fallback to local clamscan if clamd fails
        active: true,
        bypassTest: false, // Check if socket is available
      },
      preference: 'clamdscan', // Prefer daemon for better performance
    };

    const nodeClam = new NodeClam();
    this.clamscan = await nodeClam.init(clamScanOptions);
  }

  /**
   * Scan a buffer for viruses using stream scanning
   */
  async scanBuffer(buffer: Buffer, filename?: string): Promise<ScanResult> {
    if (!this.isEnabled || !this.clamscan) {
     
      return { isInfected: false, viruses: [] };
    }

    try {

      
      // Convert buffer to stream for better compatibility
      const { Readable } = require('stream');
      const stream = Readable.from(buffer);
      
      const result = await this.clamscan.scanStream(stream);
      
      const scanResult: ScanResult = {
        isInfected: result.isInfected,
        viruses: result.viruses || [],
        file: result.file || filename,
        goodFiles: result.goodFiles,
        badFiles: result.badFiles,
      };

      if (scanResult.isInfected) {
       
      } else {
   
      }

      return scanResult;
    } catch (error) {
   
      
      // In production, you might want to reject uploads if scanning fails
      // For now, we'll allow uploads to continue with a warning
      if (this.configService.get<boolean>('VIRUS_SCAN_STRICT', false)) {
        throw new Error(`Virus scan failed: ${error.message}`);
      }
      
  
      return { isInfected: false, viruses: [] };
    }
  }

  /**
   * Scan a file path for viruses
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    if (!this.isEnabled || !this.clamscan) {

      return { isInfected: false, viruses: [] };
    }

    try {
    
      
      const result = await this.clamscan.scanFile(filePath);
      
      const scanResult: ScanResult = {
        isInfected: result.isInfected,
        viruses: result.viruses || [],
        file: result.file,
        goodFiles: result.goodFiles,
        badFiles: result.badFiles,
      };

      if (scanResult.isInfected) {
     
      } else {
 
      }

      return scanResult;
    } catch (error) {

      
      if (this.configService.get<boolean>('VIRUS_SCAN_STRICT', false)) {
        throw new Error(`Virus scan failed: ${error.message}`);
      }
      
   
      return { isInfected: false, viruses: [] };
    }
  }

  /**
   * Check if virus scanning is enabled and available
   */
  isAvailable(): boolean {
    return this.isEnabled && this.clamscan !== null;
  }

  /**
   * Get scanner version and database info
   */
  async getVersion(): Promise<any> {
    if (!this.isEnabled || !this.clamscan) {
      return null;
    }

    try {
      return await this.clamscan.getVersion();
    } catch (error) {

      return null;
    }
  }
}
