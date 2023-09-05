#!/bin/bash

# Default to staging for other branches
ENVIRONMENT="staging"

# Determine the environment based on the branch
if [ "$CIRCLE_BRANCH" = "main" ]; then
  ENVIRONMENT="production"
fi

# Fetch the secret from AWS Secrets Manager
AWS_ENV_VALUES=$(aws secretsmanager get-secret-value --secret-id "timesheeter-$ENVIRONMENT" --query SecretString --output text)

# Check if the secret was successfully fetched
if [ $? -ne 0 ]; then
  echo "Error fetching secret from AWS Secrets Manager"
  exit 1
fi

# Save the secret to .env file based on the environment
echo "$AWS_ENV_VALUES" > ".env.$ENVIRONMENT"

# Confirm that the secret has been saved
echo "Secret has been saved to .env.$ENVIRONMENT file"

# Loop through the secrets and export each key/value pair as an environment variable
echo "$AWS_ENV_VALUES" | jq -c 'to_entries[]' | while IFS= read -r entry; do
  key=$(echo "$entry" | jq -r ".key")
  value=$(echo "$entry" | jq -r ".value")

  echo "export $key=$value" >> "$BASH_ENV"
done

# Source the environment variables
source "$BASH_ENV"

# Confirm that the environment variables have been set
echo "Environment variables have been set"
