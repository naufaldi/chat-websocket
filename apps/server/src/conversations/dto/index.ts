import { createConversationSchema } from '@chat/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsePipes } from '@nestjs/common';

export { createConversationSchema };

export const CreateConversationPipe = new ZodValidationPipe(createConversationSchema);

export const ConversationQueryDto = {
  cursor: { type: String, required: false },
  limit: { type: Number, required: false, default: 20 },
} as const;
