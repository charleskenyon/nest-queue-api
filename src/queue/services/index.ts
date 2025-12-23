import { Type } from "@nestjs/common";
import { IQueueService } from "../queue.interface";
import { SqsQueueService } from "./sqs-queue.service";
import { RabbitMqQueueService } from "./rabbitmq-queue.service";

const servicesMap: Record<string, Type<IQueueService>> = {
  sqs: SqsQueueService,
  rabbitmq: RabbitMqQueueService,
};

export default servicesMap;
