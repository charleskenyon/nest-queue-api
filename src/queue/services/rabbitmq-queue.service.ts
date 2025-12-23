import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import amqp from "amqplib";
import { IQueueService } from "../queue.interface";

@Injectable()
export class RabbitMqQueueService
  implements IQueueService, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RabbitMqQueueService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private isConnected = false;
  private readonly url: string;
  private readonly queueName: string;
  private readonly exchangeName: string;
  private readonly routingKey: string;

  constructor(private readonly configService: ConfigService) {
    this.url = this.configService.get<string>("RABBITMQ_URL");
    this.queueName = this.configService.get<string>("RABBITMQ_QUEUE_NAME");
    this.exchangeName = this.configService.get<string>("RABBITMQ_EXCHANGE");
    this.routingKey = this.configService.get<string>("RABBITMQ_ROUTING_KEY");
  }

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      this.isConnected = true;

      // Declare exchange
      await this.channel.assertExchange(this.exchangeName, "topic", {
        durable: true,
      });

      // Declare queue
      await this.channel.assertQueue(this.queueName, {
        durable: true,
      });

      // Bind queue to exchange
      await this.channel.bindQueue(
        this.queueName,
        this.exchangeName,
        this.routingKey
      );

      this.logger.log(
        `RabbitMQ connected: Queue=${this.queueName}, Exchange=${this.exchangeName}`
      );

      // Handle connection errors
      this.connection.on("error", (err) => {
        this.logger.error("RabbitMQ connection error", err);
        this.isConnected = false;
      });

      this.connection.on("close", () => {
        this.logger.warn("RabbitMQ connection closed");
        this.isConnected = false;
      });
    } catch (error) {
      this.logger.error("Failed to initialize RabbitMQ", error);
      throw error;
    }
  }

  async publishMessage(message: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error("RabbitMQ is not connected");
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const published = this.channel.publish(
        this.exchangeName,
        this.routingKey,
        messageBuffer,
        {
          persistent: true,
          timestamp: Date.now(),
          contentType: "application/json",
          headers: {
            messageType: message.type || "unknown",
          },
        }
      );

      if (published) {
        this.logger.log(
          `Message published to RabbitMQ: ${JSON.stringify(message)}`
        );
      } else {
        this.logger.warn("Message was not published (buffer full)");
      }
    } catch (error) {
      this.logger.error("Failed to publish message to RabbitMQ", error);
      throw error;
    }
  }

  async subscribeToMessages(
    callback: (message: any) => Promise<void>
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("RabbitMQ is not connected");
    }

    try {
      this.logger.log(`Subscribing to RabbitMQ queue: ${this.queueName}`);

      // Set prefetch to 1 to process one message at a time
      await this.channel.prefetch(1);

      await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (msg) {
            try {
              const content = msg.content.toString();
              const parsedMessage = JSON.parse(content);

              this.logger.log(`Received message from RabbitMQ: ${content}`);

              await callback(parsedMessage);

              // Acknowledge message after successful processing
              this.channel.ack(msg);
            } catch (error) {
              this.logger.error("Error processing message", error);
              // Reject message and requeue if processing fails
              this.channel.nack(msg, false, true);
            }
          }
        },
        {
          noAck: false, // Manual acknowledgment
        }
      );

      this.logger.log("Successfully subscribed to RabbitMQ queue");
    } catch (error) {
      this.logger.error("Failed to subscribe to RabbitMQ", error);
      throw error;
    }
  }

  async close(): Promise<void> {
    this.logger.log("Closing RabbitMQ connection...");
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      this.logger.log("RabbitMQ connection closed");
    } catch (error) {
      this.logger.error("Error closing RabbitMQ connection", error);
    }
  }

  async onModuleDestroy() {
    await this.close();
  }
}
