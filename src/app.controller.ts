import { Controller, Get, Post, Body } from "@nestjs/common";
import { AppService } from "./app.service";
import { PublishMessageDto } from "./publish-message.dto";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get("health")
  getHealth() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      queueProvider: process.env.QUEUE_PROVIDER || "not set",
    };
  }

  @Post("messages")
  async publishMessage(@Body() message: PublishMessageDto) {
    await this.appService.publishMessage(message);
    return {
      success: true,
      message: "Message published to queue successfully",
    };
  }
}
