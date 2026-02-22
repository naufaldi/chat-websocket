import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReadReceiptsService } from './read-receipts.service';
import { receiptReadEventSchema } from '@chat/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Read Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class ReadReceiptsController {
  constructor(private readonly readReceiptsService: ReadReceiptsService) {}

  @Get(':messageId/receipts')
  @ApiOperation({ summary: 'Get read receipts for a message' })
  @ApiParam({ name: 'messageId', description: 'Message UUID', required: true })
  @ApiResponse({ status: 200, description: 'List of read receipts' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getReceipts(
    @Request() req: { user: { userId: string } },
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.readReceiptsService.getReceiptsForMessage(messageId, req.user.userId);
  }

  @Post(':messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiParam({ name: 'messageId', description: 'Message UUID', required: true })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  async markAsRead(
    @Request() req: { user: { userId: string } },
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Body(new ZodValidationPipe(receiptReadEventSchema)) data: {
      conversationId: string;
      messageId: string;
      lastReadMessageId?: string;
    },
  ) {
    await this.readReceiptsService.markAsRead(
      req.user.userId,
      data.conversationId,
      messageId
    );
    return { message: 'Message marked as read' };
  }
}
