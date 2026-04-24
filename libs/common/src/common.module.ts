import { Module, Global } from '@nestjs/common';
import { PaginationService } from './services/pagination/pagination.service';

@Global()
@Module({
  providers: [PaginationService],
  exports: [PaginationService],
})
export class CommonModule {}
