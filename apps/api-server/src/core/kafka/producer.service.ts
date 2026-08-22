import { Kafka, Producer } from 'kafkajs';
import { config } from '../../config';

class KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'api-server-producer',
      brokers: config.kafkaBrokers || ['localhost:9092']
    });
    this.producer = this.kafka.producer();
  }

  async connect() {
    if (this.isConnected) return;
    try {
      await this.producer.connect();
      this.isConnected = true;
      console.log('✅ Kafka Producer connected');
    } catch (err) {
      console.error('❌ Failed to connect Kafka Producer', err);
    }
  }

  async sendEvent(topic: string, payload: any) {
    if (!this.isConnected) await this.connect();
    
    try {
      await this.producer.send({
        topic,
        messages: [
          { value: JSON.stringify(payload) }
        ],
      });
    } catch (err) {
      console.error(`❌ Failed to send event to ${topic}`, err);
    }
  }

  async disconnect() {
    await this.producer.disconnect();
    this.isConnected = false;
  }
}

export const kafkaProducer = new KafkaProducerService();
