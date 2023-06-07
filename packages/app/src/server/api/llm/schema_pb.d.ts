// package: 
// file: src/server/api/llm/schema.proto

import * as jspb from "google-protobuf";

export class MemoryVariant extends jspb.Message {
  hasDisabled(): boolean;
  clearDisabled(): void;
  getDisabled(): Disabled | undefined;
  setDisabled(value?: Disabled): void;

  hasBuffer(): boolean;
  clearBuffer(): void;
  getBuffer(): Buffer | undefined;
  setBuffer(value?: Buffer): void;

  hasBufferWindow(): boolean;
  clearBufferWindow(): void;
  getBufferWindow(): BufferWindow | undefined;
  setBufferWindow(value?: BufferWindow): void;

  getVariantCase(): MemoryVariant.VariantCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): MemoryVariant.AsObject;
  static toObject(includeInstance: boolean, msg: MemoryVariant): MemoryVariant.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: MemoryVariant, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): MemoryVariant;
  static deserializeBinaryFromReader(message: MemoryVariant, reader: jspb.BinaryReader): MemoryVariant;
}

export namespace MemoryVariant {
  export type AsObject = {
    disabled?: Disabled.AsObject,
    buffer?: Buffer.AsObject,
    bufferWindow?: BufferWindow.AsObject,
  }

  export enum VariantCase {
    VARIANT_NOT_SET = 0,
    DISABLED = 1,
    BUFFER = 2,
    BUFFER_WINDOW = 3,
  }
}

export class Disabled extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Disabled.AsObject;
  static toObject(includeInstance: boolean, msg: Disabled): Disabled.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Disabled, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Disabled;
  static deserializeBinaryFromReader(message: Disabled, reader: jspb.BinaryReader): Disabled;
}

export namespace Disabled {
  export type AsObject = {
  }
}

export class Buffer extends jspb.Message {
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Buffer.AsObject;
  static toObject(includeInstance: boolean, msg: Buffer): Buffer.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Buffer, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Buffer;
  static deserializeBinaryFromReader(message: Buffer, reader: jspb.BinaryReader): Buffer;
}

export namespace Buffer {
  export type AsObject = {
  }
}

export class BufferWindow extends jspb.Message {
  getK(): number;
  setK(value: number): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): BufferWindow.AsObject;
  static toObject(includeInstance: boolean, msg: BufferWindow): BufferWindow.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: BufferWindow, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): BufferWindow;
  static deserializeBinaryFromReader(message: BufferWindow, reader: jspb.BinaryReader): BufferWindow;
}

export namespace BufferWindow {
  export type AsObject = {
    k: number,
  }
}

export class Memory extends jspb.Message {
  hasVariant(): boolean;
  clearVariant(): void;
  getVariant(): MemoryVariant | undefined;
  setVariant(value?: MemoryVariant): void;

  getTag(): string;
  setTag(value: string): void;

  getMemoryserialized(): string;
  setMemoryserialized(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Memory.AsObject;
  static toObject(includeInstance: boolean, msg: Memory): Memory.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Memory, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Memory;
  static deserializeBinaryFromReader(message: Memory, reader: jspb.BinaryReader): Memory;
}

export namespace Memory {
  export type AsObject = {
    variant?: MemoryVariant.AsObject,
    tag: string,
    memoryserialized: string,
  }
}

export class ZendeskReaderIntegration extends jspb.Message {
  getZendesksubdomain(): string;
  setZendesksubdomain(value: string): void;

  getLocale(): string;
  setLocale(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ZendeskReaderIntegration.AsObject;
  static toObject(includeInstance: boolean, msg: ZendeskReaderIntegration): ZendeskReaderIntegration.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ZendeskReaderIntegration, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ZendeskReaderIntegration;
  static deserializeBinaryFromReader(message: ZendeskReaderIntegration, reader: jspb.BinaryReader): ZendeskReaderIntegration;
}

export namespace ZendeskReaderIntegration {
  export type AsObject = {
    zendesksubdomain: string,
    locale: string,
  }
}

export class WordpressReaderIntegration extends jspb.Message {
  getUrl(): string;
  setUrl(value: string): void;

  getUsername(): string;
  setUsername(value: string): void;

  getPassword(): string;
  setPassword(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): WordpressReaderIntegration.AsObject;
  static toObject(includeInstance: boolean, msg: WordpressReaderIntegration): WordpressReaderIntegration.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: WordpressReaderIntegration, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): WordpressReaderIntegration;
  static deserializeBinaryFromReader(message: WordpressReaderIntegration, reader: jspb.BinaryReader): WordpressReaderIntegration;
}

export namespace WordpressReaderIntegration {
  export type AsObject = {
    url: string,
    username: string,
    password: string,
  }
}

export class Integration extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getType(): string;
  setType(value: string): void;

  getName(): string;
  setName(value: string): void;

  getDescription(): string;
  setDescription(value: string): void;

  hasZendeskreader(): boolean;
  clearZendeskreader(): void;
  getZendeskreader(): ZendeskReaderIntegration | undefined;
  setZendeskreader(value?: ZendeskReaderIntegration): void;

  hasWordpressreader(): boolean;
  clearWordpressreader(): void;
  getWordpressreader(): WordpressReaderIntegration | undefined;
  setWordpressreader(value?: WordpressReaderIntegration): void;

  getDetailsCase(): Integration.DetailsCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Integration.AsObject;
  static toObject(includeInstance: boolean, msg: Integration): Integration.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Integration, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Integration;
  static deserializeBinaryFromReader(message: Integration, reader: jspb.BinaryReader): Integration;
}

export namespace Integration {
  export type AsObject = {
    id: string,
    type: string,
    name: string,
    description: string,
    zendeskreader?: ZendeskReaderIntegration.AsObject,
    wordpressreader?: WordpressReaderIntegration.AsObject,
  }

  export enum DetailsCase {
    DETAILS_NOT_SET = 0,
    ZENDESKREADER = 5,
    WORDPRESSREADER = 6,
  }
}

export class Tools extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getType(): string;
  setType(value: string): void;

  getName(): string;
  setName(value: string): void;

  getDescription(): string;
  setDescription(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Tools.AsObject;
  static toObject(includeInstance: boolean, msg: Tools): Tools.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Tools, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Tools;
  static deserializeBinaryFromReader(message: Tools, reader: jspb.BinaryReader): Tools;
}

export namespace Tools {
  export type AsObject = {
    id: string,
    type: string,
    name: string,
    description: string,
  }
}

export class Model extends jspb.Message {
  getId(): string;
  setId(value: string): void;

  getWorkspaceid(): string;
  setWorkspaceid(value: string): void;

  getName(): string;
  setName(value: string): void;

  hasMemory(): boolean;
  clearMemory(): void;
  getMemory(): Memory | undefined;
  setMemory(value?: Memory): void;

  clearIntegrationsList(): void;
  getIntegrationsList(): Array<Integration>;
  setIntegrationsList(value: Array<Integration>): void;
  addIntegrations(value?: Integration, index?: number): Integration;

  clearToolsList(): void;
  getToolsList(): Array<Tools>;
  setToolsList(value: Array<Tools>): void;
  addTools(value?: Tools, index?: number): Tools;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Model.AsObject;
  static toObject(includeInstance: boolean, msg: Model): Model.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Model, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Model;
  static deserializeBinaryFromReader(message: Model, reader: jspb.BinaryReader): Model;
}

export namespace Model {
  export type AsObject = {
    id: string,
    workspaceid: string,
    name: string,
    memory?: Memory.AsObject,
    integrationsList: Array<Integration.AsObject>,
    toolsList: Array<Tools.AsObject>,
  }
}

export class ModelAccessQuery extends jspb.Message {
  getModelid(): string;
  setModelid(value: string): void;

  getMemorytag(): string;
  setMemorytag(value: string): void;

  getAccesstoken(): string;
  setAccesstoken(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ModelAccessQuery.AsObject;
  static toObject(includeInstance: boolean, msg: ModelAccessQuery): ModelAccessQuery.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ModelAccessQuery, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ModelAccessQuery;
  static deserializeBinaryFromReader(message: ModelAccessQuery, reader: jspb.BinaryReader): ModelAccessQuery;
}

export namespace ModelAccessQuery {
  export type AsObject = {
    modelid: string,
    memorytag: string,
    accesstoken: string,
  }
}

export class ModelAccessQueryResponse extends jspb.Message {
  hasModel(): boolean;
  clearModel(): void;
  getModel(): Model | undefined;
  setModel(value?: Model): void;

  hasError(): boolean;
  clearError(): void;
  getError(): string;
  setError(value: string): void;

  getResponseCase(): ModelAccessQueryResponse.ResponseCase;
  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): ModelAccessQueryResponse.AsObject;
  static toObject(includeInstance: boolean, msg: ModelAccessQueryResponse): ModelAccessQueryResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: ModelAccessQueryResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): ModelAccessQueryResponse;
  static deserializeBinaryFromReader(message: ModelAccessQueryResponse, reader: jspb.BinaryReader): ModelAccessQueryResponse;
}

export namespace ModelAccessQueryResponse {
  export type AsObject = {
    model?: Model.AsObject,
    error: string,
  }

  export enum ResponseCase {
    RESPONSE_NOT_SET = 0,
    MODEL = 1,
    ERROR = 2,
  }
}

export class SetMemoryMutation extends jspb.Message {
  hasVariant(): boolean;
  clearVariant(): void;
  getVariant(): MemoryVariant | undefined;
  setVariant(value?: MemoryVariant): void;

  getTag(): string;
  setTag(value: string): void;

  getWorkspaceid(): string;
  setWorkspaceid(value: string): void;

  getModelid(): string;
  setModelid(value: string): void;

  getMemoryserialized(): string;
  setMemoryserialized(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SetMemoryMutation.AsObject;
  static toObject(includeInstance: boolean, msg: SetMemoryMutation): SetMemoryMutation.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SetMemoryMutation, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SetMemoryMutation;
  static deserializeBinaryFromReader(message: SetMemoryMutation, reader: jspb.BinaryReader): SetMemoryMutation;
}

export namespace SetMemoryMutation {
  export type AsObject = {
    variant?: MemoryVariant.AsObject,
    tag: string,
    workspaceid: string,
    modelid: string,
    memoryserialized: string,
  }
}

export class SetMemoryMutationResponse extends jspb.Message {
  getError(): string;
  setError(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SetMemoryMutationResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SetMemoryMutationResponse): SetMemoryMutationResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SetMemoryMutationResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SetMemoryMutationResponse;
  static deserializeBinaryFromReader(message: SetMemoryMutationResponse, reader: jspb.BinaryReader): SetMemoryMutationResponse;
}

export namespace SetMemoryMutationResponse {
  export type AsObject = {
    error: string,
  }
}

