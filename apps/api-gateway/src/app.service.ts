import { Injectable } from '@nestjs/common';
import {
  AppHealthDto,
  MemoryDto,
  CpuDto,
} from '@app/common/dto/app-health.dto';
import * as os from 'os';

@Injectable()
export class AppService {
  private readonly startTime: number = Date.now();

  getRoot(): { message: string } {
    return { message: 'OK!' };
  }

  getHealth(): AppHealthDto {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    const uptimePretty = this.formatUptime(uptimeSeconds);
    const timestamp = Date.now();

    const memory = this.getMemoryInfo();
    const cpu = this.getCpuInfo();

    return {
      status: 'ok',
      uptime: uptimeSeconds,
      uptimePretty,
      timestamp,
      memory,
      cpu,
    };
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours}hr${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes}min${minutes > 1 ? 's' : ''}`);
    if (secs > 0 || parts.length === 0)
      parts.push(`${secs}sec${secs !== 1 ? 's' : ''}`);

    return parts.join(', ');
  }

  private getMemoryInfo(): MemoryDto {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    const usagePercent = ((usedBytes / totalBytes) * 100).toFixed(0);

    const processMemory = process.memoryUsage();
    const rssBytes = processMemory.rss;
    const heapTotalBytes = processMemory.heapTotal;
    const heapUsedBytes = processMemory.heapUsed;
    const externalBytes = processMemory.external || 0;

    return {
      total: this.formatBytes(totalBytes),
      used: this.formatBytes(usedBytes),
      free: this.formatBytes(freeBytes),
      usage: `${usagePercent}%`,
      process: {
        rss: this.formatBytes(rssBytes),
        heapTotal: this.formatBytes(heapTotalBytes),
        heapUsed: this.formatBytes(heapUsedBytes),
        external: this.formatBytes(externalBytes),
      } as MemoryDto['process'],
    };
  }

  private getCpuInfo(): CpuDto {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();

    return {
      cores: cpus.length,
      loadAverage: loadAverage.map((load) => Math.round(load * 100) / 100),
      platform: os.platform(),
      arch: os.arch(),
    };
  }

  private formatBytes(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb * 100) / 100} MB`;
  }
}
