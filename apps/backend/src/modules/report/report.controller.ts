import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('boards/:boardId/reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('cfd')
  @ApiOperation({ summary: 'Get Cumulative Flow Diagram data for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiQuery({ name: 'from', description: 'From date (ISO 8601)', required: true })
  @ApiQuery({ name: 'to', description: 'To date (ISO 8601)', required: true })
  @ApiResponse({ status: 200, description: 'CFD data points by date' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCFDData(
    @Param('boardId') boardId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportService.getCFDData(boardId, new Date(from), new Date(to));
  }

  @Get('lead-time')
  @ApiOperation({ summary: 'Get lead time data for cards on a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiQuery({ name: 'from', description: 'From date (ISO 8601)', required: true })
  @ApiQuery({ name: 'to', description: 'To date (ISO 8601)', required: true })
  @ApiResponse({ status: 200, description: 'Lead time per card' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getLeadTimeData(
    @Param('boardId') boardId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportService.getLeadTimeData(boardId, new Date(from), new Date(to));
  }

  @Get('throughput')
  @ApiOperation({ summary: 'Get throughput data (cards completed per day) for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiQuery({ name: 'from', description: 'From date (ISO 8601)', required: true })
  @ApiQuery({ name: 'to', description: 'To date (ISO 8601)', required: true })
  @ApiResponse({ status: 200, description: 'Throughput per day' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getThroughputData(
    @Param('boardId') boardId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportService.getThroughputData(boardId, new Date(from), new Date(to));
  }

  @Post('snapshot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually trigger a column snapshot for a board' })
  @ApiParam({ name: 'boardId', description: 'Board ID' })
  @ApiResponse({ status: 200, description: 'Snapshot taken' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async takeSnapshot(@Param('boardId') boardId: string) {
    await this.reportService.takeSnapshot(boardId);
    return { message: 'Snapshot taken successfully' };
  }
}
