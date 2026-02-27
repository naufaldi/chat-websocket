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
import { ConversationsService } from './conversations.service';
import { createConversationSchema, sendMessageSchema, type ConversationListItem, type ConversationDetail, type SendMessageResponse, type Message } from '@chat/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List user conversations' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Pagination cursor' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default: 20, max: 100)' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  async findAll(
    @Request() req: { user: { userId: string } },
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ): Promise<{ conversations: ConversationListItem[]; nextCursor: string | null; hasMore: boolean }> {
    const safeLimit = Math.min(Math.max(1, limit || 20), 100);
    return this.conversationsService.findAllByUser(req.user.userId, cursor, safeLimit);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiResponse({ status: 201, description: 'Conversation created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @Request() req: { user: { userId: string } },
    @Body(new ZodValidationPipe(createConversationSchema)) data: {
      type: 'direct' | 'group';
      title?: string;
      participantIds: string[];
    },
  ): Promise<ConversationDetail> {
    return this.conversationsService.create(data, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation details' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async findOne(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConversationDetail> {
    return this.conversationsService.findById(id, req.user.userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'List messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page size (default: 50, max: 100)' })
  @ApiResponse({ status: 200, description: 'Conversation messages' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async listMessages(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<{ messages: Message[] }> {
    const safeLimit = Math.min(Math.max(1, limit || 50), 100);
    return this.conversationsService.listMessages(id, req.user.userId, safeLimit);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message via HTTP' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 200, description: 'Message already exists (idempotent)' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Not a participant' })
  @ApiResponse({ status: 429, description: 'Rate limited' })
  async sendMessage(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) data: {
      content: string;
      contentType: 'text';
      clientMessageId: string;
      replyToId?: string;
    },
  ): Promise<SendMessageResponse> {
    return this.conversationsService.sendMessageHttp(id, req.user.userId, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a conversation (owner only)' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Conversation deleted' })
  @ApiResponse({ status: 403, description: 'Not the owner' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async delete(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.conversationsService.delete(id, req.user.userId);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Join a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 201, description: 'Joined conversation' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async join(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.conversationsService.join(id, req.user.userId);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Left conversation' })
  @ApiResponse({ status: 403, description: 'Owner cannot leave' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async leave(
    @Request() req: { user: { userId: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.conversationsService.leave(id, req.user.userId);
  }
}
