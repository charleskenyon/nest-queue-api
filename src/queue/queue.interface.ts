export interface IQueueService {
  /**
   * Publish a message to the queue
   */
  publishMessage(message: any): Promise<void>;

  /**
   * Subscribe to messages from the queue
   */
  subscribeToMessages(callback: (message: any) => Promise<void>): Promise<void>;

  /**
   * Close connections and cleanup
   */
  close(): Promise<void>;
}
