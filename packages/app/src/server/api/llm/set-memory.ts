import { type NextApiRequest, type NextApiResponse } from "next";
import { prisma } from "@timesheeter/app/server/db";
import {
  SetMemoryMutation as SetMemoryMutationProto,
  SetMemoryMutationResponse as SetMemoryMutationResponseProto,
  type MemoryVariant as MemoryVariantProto,
} from "./schema_pb";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let mutation: SetMemoryMutationProto.AsObject | null = null;

  res.setHeader("Content-Type", "application/octet-stream");
  const response = new SetMemoryMutationResponseProto();

  if (req.method !== "POST") {
    response.setError("Invalid method, POST required");
    res.send(response.serializeBinary());
    return;
  }

  try {
    mutation = SetMemoryMutationProto.deserializeBinary(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Buffer.from(req.body)
    ).toObject();
  } catch (e) {
    response.setError("Invalid data");
    res.send(response.serializeBinary());
    return;
  }

  // TODO: handle access

  const memoryType = getMemoryType(
    mutation.variant as MemoryVariantProto.AsObject
  );

  let memory = await prisma.memory.findFirst({
    where: {
      workspaceId: mutation.workspaceid,
      modelId: mutation.modelid,
      type: memoryType,
      tag: mutation.tag,
    },
  });

  if (!memory) {
    // Create memory
    memory = await prisma.memory.create({
      data: {
        workspaceId: mutation.workspaceid,
        modelId: mutation.modelid,
        type: memoryType,
        tag: mutation.tag,
        memorySerialized: mutation.memoryserialized,
      },
    });
  }

  // Update memory
  memory = await prisma.memory.update({
    where: {
      id: memory.id,
    },
    data: {
      memorySerialized: mutation.memoryserialized,
    },
  });

  res.send(response.serializeBinary());
};

export default handler;

const getMemoryType = (variantProto: MemoryVariantProto.AsObject): string => {
  return Object.keys(variantProto)[0] as string;
};
