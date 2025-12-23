import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand,
} from "@aws-sdk/client-sqs";
import { IQueueService } from "../queue.interface";

@Injectable()
export class SqsQueueService implements IQueueService, OnModuleDestroy {
  private readonly logger = new Logger(SqsQueueService.name);
  private sqsClient: SQSClient;
  private queueUrl: string;
  private isPolling = false;
  private pollingInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>("AWS_REGION");
    const endpoint = this.configService.get<string>("AWS_ENDPOINT");
    const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>(
      "AWS_SECRET_ACCESS_KEY"
    );
    this.queueUrl = this.configService.get<string>("SQS_QUEUE_URL");

    this.sqsClient = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.initializeQueue();
  }

  private async initializeQueue() {
    try {
      // If full URL is provided, use it directly
      if (this.queueUrl.startsWith("http")) {
        this.logger.log(`Using SQS queue URL: ${this.queueUrl}`);
      } else {
        // Otherwise, get the URL from queue name
        const command = new GetQueueUrlCommand({
          QueueName: this.queueUrl,
        });
        const response = await this.sqsClient.send(command);
        this.queueUrl = response.QueueUrl;
        this.logger.log(`Retrieved SQS queue URL: ${this.queueUrl}`);
      }
    } catch (error) {
      this.logger.error("Failed to initialize SQS queue", error);
      throw error;
    }
  }

  async publishMessage(message: any): Promise<void> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
        MessageAttributes: {
          Timestamp: {
            DataType: "String",
            StringValue: new Date().toISOString(),
          },
          MessageType: {
            DataType: "String",
            StringValue: message.type || "unknown",
          },
        },
      });

      const response = await this.sqsClient.send(command);
      this.logger.log(`Message published to SQS: ${response.MessageId}`);
    } catch (error) {
      this.logger.error("Failed to publish message to SQS", error);
      throw error;
    }
  }

  async subscribeToMessages(
    callback: (message: any) => Promise<void>
  ): Promise<void> {
    if (this.isPolling) {
      this.logger.warn("Already polling for messages");
      return;
    }

    this.isPolling = true;
    this.logger.log("Starting to poll SQS for messages...");

    const pollMessages = async () => {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 20, // Long polling
          MessageAttributeNames: ["All"],
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          this.logger.log(
            `Received ${response.Messages.length} message(s) from SQS`
          );

          for (const message of response.Messages) {
            try {
              const parsedMessage = JSON.parse(message.Body);
              await callback(parsedMessage);

              // Delete message after successful processing
              await this.deleteMessage(message.ReceiptHandle);
            } catch (error) {
              this.logger.error("Error processing message", error);
            }
          }
        }
      } catch (error) {
        this.logger.error("Error polling SQS", error);
      }

      // Continue polling if still active
      if (this.isPolling) {
        this.pollingInterval = setTimeout(pollMessages, 0);
      }
    };

    pollMessages();
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.sqsClient.send(command);
      this.logger.debug("Message deleted from SQS");
    } catch (error) {
      this.logger.error("Failed to delete message from SQS", error);
    }
  }

  async close(): Promise<void> {
    this.logger.log("Closing SQS connection...");
    this.isPolling = false;
    if (this.pollingInterval) {
      clearTimeout(this.pollingInterval);
    }
    this.sqsClient.destroy();
  }

  async onModuleDestroy() {
    await this.close();
  }
}
