import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AppHealthDto } from '@app/common/dto/app-health.dto';
import { Public } from './auth/guards/public.decorator';
import { Open } from './auth/guards/open.decorator';

@ApiTags('app')
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @Open()
  @ApiOperation({ summary: 'Get root endpoint' })
  getRoot(): { message: string } {
    return this.appService.getRoot();
  }

  @Get('health')
  @Public()
  @Open()
  @ApiOperation({ summary: 'Get application health status' })
  @ApiResponse({ status: 200, type: AppHealthDto })
  getHealth(): AppHealthDto {
    return this.appService.getHealth();
  }
}
