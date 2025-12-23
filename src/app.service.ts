import { Injectable, Logger, Inject, OnModuleInit } from "@nestjs/common";
import { type IQueueService } from "./queue/queue.interface";
import { PublishMessageDto } from "./publish-message.dto";
import { QUEUE_SERVICE } from "./constants";

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(QUEUE_SERVICE)
    private readonly queueService: IQueueService
  ) {}

  async onModuleInit() {
    await this.subscribeToMessages();
  }

  async publishMessage(message: PublishMessageDto): Promise<void> {
    this.logger.log(`Publishing message: type=${message.type}`);
    await this.queueService.publishMessage(message);
  }

  private async subscribeToMessages(): Promise<void> {
    this.logger.log("Starting to subscribe to messages...");

    await this.queueService.subscribeToMessages(
      async (message: PublishMessageDto) => {
        await this.handleMessage(message);
      }
    );
  }

  private async handleMessage(message: PublishMessageDto): Promise<void> {
    this.logger.log(`Processing message: ${JSON.stringify(message)}`);

    // Add your business logic here
    this.logger.log(`Message type: ${message.type}`);

    if (message.payload) {
      this.logger.log(`Message payload: ${JSON.stringify(message.payload)}`);
    }
  }
}
