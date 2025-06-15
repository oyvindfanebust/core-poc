import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';

export class LocalTigerBeetle {
  private process: ChildProcess | null = null;
  private dataFile: string;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.dataFile = path.join(__dirname, `../../tmp/test_${Date.now()}_0.tigerbeetle`);
  }

  async start(): Promise<{ port: number; address: string }> {
    // Ensure tmp directory exists
    const tmpDir = path.dirname(this.dataFile);
    await fs.mkdir(tmpDir, { recursive: true });

    // Format the database
    await this.formatDatabase();

    // Start TigerBeetle
    return new Promise((resolve, reject) => {
      this.process = spawn('./tigerbeetle', [
        'start',
        `--addresses=${this.port}`,
        '--development',
        this.dataFile
      ], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../..'),
      });

      let started = false;

      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        if ((output.includes('listening') || output.includes('started with extra verification')) && !started) {
          started = true;
          resolve({
            port: this.port,
            address: `${this.port}`,
          });
        }
      });

      this.process.stderr?.on('data', (data) => {
        const output = data.toString();
        if ((output.includes('listening') || output.includes('started with extra verification')) && !started) {
          started = true;
          resolve({
            port: this.port,
            address: `${this.port}`,
          });
        }
      });

      this.process.on('error', (error) => {
        if (!started) {
          reject(error);
        }
      });

      this.process.on('exit', (code) => {
        if (code !== 0 && !started) {
          reject(new Error(`TigerBeetle exited with code ${code}`));
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!started) {
          reject(new Error('TigerBeetle startup timeout'));
        }
      }, 10000);
    });
  }

  async stop(): Promise<void> {
    if (this.process) {
      // Force kill the process
      this.process.kill('SIGKILL');
      
      // Wait for process to exit with timeout
      await new Promise<void>((resolve) => {
        if (this.process) {
          const timeout = setTimeout(() => {
            resolve(); // Don't wait forever
          }, 2000);
          
          this.process.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        } else {
          resolve();
        }
      });
      
      this.process = null;
    }

    // Clean up data file
    try {
      await fs.unlink(this.dataFile);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  private async formatDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const formatProcess = spawn('./tigerbeetle', [
        'format',
        '--cluster=0',
        '--replica=0',
        '--replica-count=1',
        '--development',
        this.dataFile
      ], {
        stdio: 'pipe',
        cwd: path.join(__dirname, '../..'),
      });

      formatProcess.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Database format failed with code ${code}`));
        }
      });

      formatProcess.on('error', reject);
    });
  }
}