import { DynamicModule, Module, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import servicesMap from "./services";
import { QUEUE_SERVICE } from "../constants";

export interface QueueModuleOptions {
  provider?: "sqs" | "rabbitmq";
}

@Module({})
export class QueueModule {
  static forRoot(options?: QueueModuleOptions): DynamicModule {
    const queueProvider: Provider = {
      provide: QUEUE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const provider =
          options?.provider || configService.get<string>("QUEUE_PROVIDER");

        const Service = servicesMap[provider];

        if (!Service) {
          const available = Object.keys(servicesMap).join(", ");
          throw new Error(
            `Unknown queue provider: "${provider}". Available providers: ${available}`
          );
        }

        return new Service(configService);
      },
      inject: [ConfigService],
    };

    return {
      module: QueueModule,
      providers: [queueProvider],
      exports: [queueProvider],
    };
  }
}
