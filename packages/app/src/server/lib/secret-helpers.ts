import crypto from "crypto";
import { env } from "@timesheeter/app/env";

const algorithm = "aes-256-cbc"; // Advanced Encryption Standard (AES) with 256-bit key in Cipher Block Chaining (CBC) mode

const secretKey = env.CONFIG_SECRET_KEY;

type EncryptedData = {
  iv: string;
  encryptedData: string;
};

export const encrypt = (message: string): string => {
  // Create a random initialization vector (IV)
  const iv = crypto.randomBytes(16);

  // Create a cipher object
  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

  // Encrypt the message
  let encrypted = cipher.update(message, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return the encrypted message and IV as a JSON object
  return JSON.stringify({
    iv: iv.toString("hex"),
    encryptedData: encrypted,
  });
};

export const decrypt = (encryptedData: string): string => {
  // Parse the encrypted data and IV from the JSON object
  const { iv, encryptedData: encryptedMessage } = JSON.parse(
    encryptedData
  ) as EncryptedData;

  // Create a decipher object
  const decipher = crypto.createDecipheriv(
    algorithm,
    secretKey,
    Buffer.from(iv, "hex")
  );

  // Decrypt the message
  let decrypted = decipher.update(encryptedMessage, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

// Returns the length of the config key as **** bar allowedLength which is shown in the UI
// -1 for allowedLength will show none of the key
const scrub = (key: string, protectCount = 4) => {
  if (protectCount === 0) {
    return key;
  }

  if (key.length <= protectCount || protectCount === -1) {
    return "*".repeat(key.length);
  }

  return `${"*".repeat(key.length - protectCount)} ${key.slice(-protectCount)}`;
};

type FieldDefinitions = {
  accessor: string;
  protectCount: number;
  [key: string]: unknown;
};

// Cleans up the config to remove any sensitive data
export const filterConfig = <T>(
  config: T,
  definitions: readonly FieldDefinitions[],
  configType: string
): T => {
  const filteredConfig: Record<string, string> = {
    type: configType,
  };

  for (const field of definitions) {
    filteredConfig[field.accessor] = scrub(
      // @ts-expect-error we can be sure that the field exists
      config[field.accessor] as string,
      field.protectCount
    );
  }

  return filteredConfig as T;
};
