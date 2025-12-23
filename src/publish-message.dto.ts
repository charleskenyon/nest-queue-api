import { IsString, IsNotEmpty, IsOptional, IsObject } from "class-validator";

export class PublishMessageDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;

  @IsString()
  @IsOptional()
  messageId?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;
}
