## Prerequisites

- Node.js 24+ (use `nvm use`)
- Docker Desktop running
- npm 10+

## Quick Start

```bash
# 1. Use correct Node version
nvm use

# 2. Install dependencies
npm i

# 3. Start Docker services (just LocalStack & RabbitMQ)
docker compose up -d

# 4. Start the API (runs on your computer)
npm run start:dev
```

## Test It

```bash
# Publish message
curl -X POST http://localhost:3001/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "payload": {"message": "test"}
  }'
```

## Change Queue Providers

Edit `.env`:

```env
# Use SQS
QUEUE_PROVIDER=sqs

# Use RabbitMQ
QUEUE_PROVIDER=rabbitmq
```

Restart the app (Ctrl+C, then `npm run start:dev`)

## Stop Everything

```bash
# Stop app (in terminal where it's running)
Ctrl+C

# Stop Docker services
docker compose down
```

## Considerations

How can I use both queues at once?

- Run two version of the app (one for each provider) using docker and bind each to their own port. A service would be added to docker-compose for each of these app

How can I write the app to test it and have queues ready?

- create a test script that calls docker compose up, runs e2e tests and logs either failure or success
