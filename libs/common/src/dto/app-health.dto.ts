import { ApiProperty } from '@nestjs/swagger';

export class ProcessMemoryDto {
  @ApiProperty({ example: '201 MB', description: 'Resident Set Size' })
  rss: string;

  @ApiProperty({ example: '130 MB', description: 'Total heap allocated' })
  heapTotal: string;

  @ApiProperty({ example: '117 MB', description: 'Heap used' })
  heapUsed: string;

  @ApiProperty({ example: '4 MB', description: 'External memory' })
  external: string;
}

export class MemoryDto {
  @ApiProperty({ example: '940 MB', description: 'Total system memory' })
  total: string;

  @ApiProperty({ example: '571 MB', description: 'Used system memory' })
  used: string;

  @ApiProperty({ example: '369 MB', description: 'Free system memory' })
  free: string;

  @ApiProperty({ example: '61%', description: 'Memory usage percentage' })
  usage: string;

  @ApiProperty({
    type: ProcessMemoryDto,
    description: 'Process memory details',
  })
  process: ProcessMemoryDto;
}

export class CpuDto {
  @ApiProperty({ example: 2, description: 'Number of CPU cores' })
  cores: number;

  @ApiProperty({
    example: [0, 0.03, 0.02],
    description: 'Load average for 1, 5, and 15 minutes',
    type: [Number],
  })
  loadAverage: number[];

  @ApiProperty({ example: 'linux', description: 'Platform name' })
  platform: string;

  @ApiProperty({ example: 'x64', description: 'CPU architecture' })
  arch: string;
}

export class AppHealthDto {
  @ApiProperty({ example: 'ok', description: 'Application status' })
  status: string;

  @ApiProperty({ example: 115898.893393764, description: 'Uptime in seconds' })
  uptime: number;

  @ApiProperty({
    example: '1day, 8hrs, 11mins, 38secs',
    description: 'Human-readable uptime',
  })
  uptimePretty: string;

  @ApiProperty({ example: 1770499894742, description: 'Unix timestamp' })
  timestamp: number;

  @ApiProperty({ type: MemoryDto, description: 'Memory information' })
  memory: MemoryDto;

  @ApiProperty({ type: CpuDto, description: 'CPU information' })
  cpu: CpuDto;
}
