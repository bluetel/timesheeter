import { createId } from "@paralleldrive/cuid2";
import { type NextApiRequest, type NextApiResponse } from "next";
import {
  type MemoryVariant,
  memoryVariantSchema,
} from "@timesheeter/app/lib/workspace/memory";
import { prisma } from "@timesheeter/app/server/db";
import { parseIntegration } from "../routers/workspace/integrations";
import {
  Disabled as DisabledProto,
  MemoryVariant as MemoryVariantProto,
  Model as ModelProto,
  ModelAccessQuery as ModelAccessQueryProto,
  ModelAccessQueryResponse as ModelAccessQueryResponseProto,
  Buffer as BufferProto,
  BufferWindow as BufferWindowProto,
  Memory as MemoryProto,
  ZendeskReaderIntegration as ZendeskReaderIntegrationProto,
  Integration as IntegrationProto,
  WordpressReaderIntegration as WordpressReaderIntegrationProto,
} from "./schema_pb";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  let query: ModelAccessQueryProto.AsObject | null = null;

  res.setHeader("Content-Type", "application/octet-stream");
  const response = new ModelAccessQueryResponseProto();

  if (req.method !== "POST") {
    response.setError("Invalid method, POST required");
    res.send(response.serializeBinary());
    return;
  }

  try {
    query = ModelAccessQueryProto.deserializeBinary(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Buffer.from(req.body)
    ).toObject();
  } catch (e) {
    response.setError("Invalid data");
    res.send(response.serializeBinary());
    return;
  }

  const model = await prisma.model.findFirst({
    where: {
      id: query.modelid,
    },
    include: {
      integrations: true,
    },
  });

  if (!model) {
    response.setError("Model not found");
    res.send(response.serializeBinary());
    return;
  }

  // TODO: handle access
  // if (!model.publicAccess && query.accesstoken === "") {
  //     response.setError("Access token required");
  //     res.send(response.serializeBinary());
  //     return;
  // }

  const variantZod = memoryVariantSchema.parse(
    JSON.parse(model.memoryVariantConfigSerialized)
  );

  // Create a random tag if none is provided
  const tag = query.memorytag || createId();

  const memoryProto = new MemoryProto();
  memoryProto.setVariant(parseMemoryVariant(variantZod));
  memoryProto.setTag(tag);
  memoryProto.setMemoryserialized(
    await getMemorySerialized(model.workspaceId, model.id, variantZod.type, tag)
  );

  const integrations: IntegrationProto[] = [];
  for (const integration of model.integrations.map((i) =>
    parseIntegration(i, false)
  )) {
    const integrationProto = new IntegrationProto();
    integrationProto.setId(integration.id);
    integrationProto.setType(integration.type);
    integrationProto.setName(integration.name);
    integrationProto.setName(integration.name);

    if (integration.config.type === "ZendeskReader") {
      const detailsProto = new ZendeskReaderIntegrationProto();
      detailsProto.setZendesksubdomain(integration.config.zendeskSubdomain);
      detailsProto.setLocale(integration.config.locale);

      integrationProto.setZendeskreader(detailsProto);
    } else if (integration.config.type === "WordpressReader") {
      const detailsProto = new WordpressReaderIntegrationProto();
      detailsProto.setUrl(integration.config.url);
      detailsProto.setUsername(integration.config.username);
      detailsProto.setPassword(integration.config.password);

      integrationProto.setWordpressreader(detailsProto);
    }

    integrations.push(integrationProto);
  }

  const modelProto = new ModelProto();
  modelProto.setId(model.id);
  modelProto.setWorkspaceid(model.workspaceId);
  modelProto.setName(model.name);
  modelProto.setMemory(memoryProto);
  modelProto.setIntegrationsList(integrations);

  // TODO: add tools
  modelProto.setToolsList([]);

  response.setModel(modelProto);

  res.send(response.serializeBinary());
};

export default handler;

const getMemorySerialized = async (
  workspaceId: string,
  modelId: string,
  type: string,
  tag: string
): Promise<string> => {
  let memory = await prisma.memory.findFirst({
    where: {
      workspaceId,
      modelId,
      type,
      tag,
    },
  });

  if (!memory) {
    // Create memory
    memory = await prisma.memory.create({
      data: {
        workspaceId,
        modelId,
        type,
        tag,
        memorySerialized: "",
      },
    });
  }

  return memory.memorySerialized;
};

const parseMemoryVariant = (variant: MemoryVariant): MemoryVariantProto => {
  const memoryVariantProto = new MemoryVariantProto();

  if (variant.type === "Disabled") {
    memoryVariantProto.setDisabled(new DisabledProto());
  } else if (variant.type === "Buffer") {
    memoryVariantProto.setBuffer(new BufferProto());
  } else if (variant.type === "BufferWindow") {
    const bufferWindow = new BufferWindowProto();
    bufferWindow.setK(variant.k);
    memoryVariantProto.setBufferWindow(bufferWindow);
  }

  return memoryVariantProto;
};
