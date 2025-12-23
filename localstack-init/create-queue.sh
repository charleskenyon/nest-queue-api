#!/bin/bash

echo "Creating SQS queue..."
awslocal sqs create-queue --queue-name message-queue

echo "LocalStack initialization complete"