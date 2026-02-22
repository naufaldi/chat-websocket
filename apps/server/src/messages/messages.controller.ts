import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { sendMessageSchema } from '@chat/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID', required: true })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'Conversation messages' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async list(
    @Request() req: { user: { userId: string } },
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    const safeLimit = Math.min(Math.max(1, limit || 50), 100);
    return this.messagesService.listMessages(conversationId, req.user.userId, safeLimit);
  }

  @Post()
  @ApiOperation({ summary: 'Send a message via HTTP (fallback)' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID', required: true })
  @ApiResponse({ status: 201, description: 'Message created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  async send(
    @Request() req: { user: { userId: string } },
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) data: {
      content: string;
      contentType: 'text';
      clientMessageId: string;
      replyToId?: string;
    },
  ) {
    return this.messagesService.sendMessage(req.user.userId, conversationId, {
      ...data,
      conversationId,
    });
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message (soft delete)' })
  @ApiParam({ name: 'conversationId', description: 'Conversation UUID', required: true })
  @ApiParam({ name: 'messageId', description: 'Message UUID', required: true })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Not the message sender' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async delete(
    @Request() req: { user: { userId: string } },
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    await this.messagesService.deleteMessage(messageId, req.user.userId, conversationId);
    return { message: 'Message deleted successfully' };
  }
}
