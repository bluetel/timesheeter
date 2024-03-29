import { AssetHashType, BundlingFileAccess, IgnoreMode } from 'aws-cdk-lib';
import { Code, LayerVersion, type LayerVersionProps } from 'aws-cdk-lib/aws-lambda';
import { type Construct } from 'constructs';
import crypto from 'crypto';
import { RUNTIME } from '../lib';

// modules to mark as "external" when bundling
// added to prismaModules
const PRISMA_LAYER_EXTERNAL = ['@prisma/engines', '@prisma/engines-version', '@prisma/internals'];

type PrismaEngine = 'introspection-engine' | 'schema-engine' | 'prisma-fmt' | 'libquery_engine';

export interface PrismaLayerProps extends Omit<LayerVersionProps, 'code'> {
  // e.g. 4.11.0
  prismaVersion?: string;

  // some more modules to add to the layer
  nodeModules?: string[];

  // prisma libs
  prismaModules?: string[];
  // engines to keep
  prismaEngines?: PrismaEngine[];
}

/**
 * Construct a lambda layer with Prisma libraries.
 * Be sure to omit the prisma layer modules from your function bundles with the `externalModules` option.
 * Include `environment` to point prisma at the right library location.
 *
 * @example
 * ```ts
 *   const prismaLayer = new PrismaLayer(this, "PrismaLayer", {
 *     layerVersionName: `${id}-prisma`,
 *     removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
 *   })
 *
 *   // default lambda function options
 *   const functionOptions: FunctionOptions = {
 *     layers: [prismaLayer],
 *     environment: { ...prismaLayer.environment, DEBUG: "*" },
 *     bundling: {
 *       externalModules: prismaLayer.externalModules,
 *     },
 *   }
 */
export class PrismaLayer extends LayerVersion {
  externalModules: string[];

  environment: Record<string, string>;

  constructor(scope: Construct, id: string, props: PrismaLayerProps = {}) {
    const { prismaVersion, prismaModules, ...rest } = props;
    const nodeModules = props.nodeModules || [];

    const layerDir = '/asset-output/nodejs';
    const nm = `${layerDir}/node_modules`;
    const engineDir = `${nm}/@prisma/engines`;
    const internalsDir = `${nm}/@prisma/internals`;
    const clientDir = `${nm}/@prisma/client`;

    // what are we asking npm to install?
    // deps to npm install to the layer
    const modulesToInstall = prismaModules || ['@prisma/client', '@prisma/engines'];
    const modulesToInstallWithVersion = prismaVersion
      ? modulesToInstall.map((dep) => `${dep}@${prismaVersion}`)
      : modulesToInstall;
    const modulesToInstallArgs = modulesToInstallWithVersion.concat(nodeModules).join(' ');

    // delete engines not requested
    const allEngines: PrismaEngine[] = ['introspection-engine', 'schema-engine', 'libquery_engine', 'prisma-fmt'];
    const prismaEngines = props.prismaEngines || ['libquery_engine'];
    const deleteEngineCmds = allEngines
      .filter((e) => !prismaEngines.includes(e))
      .map((e) => `rm -f ${engineDir}/${e}*`);

    const createBundleCommand = [
      // create asset bundle in docker
      'bash',
      '-c',
      [
        `echo "Installing ${modulesToInstallArgs}"`,
        'mkdir -p /tmp/npm && pushd /tmp/npm && HOME=/tmp npm i --no-save --no-package-lock npm@latest && popd',
        `mkdir -p ${layerDir}`,
        // install PRISMA_DEPS
        `cd ${layerDir} && HOME=/tmp /tmp/npm/node_modules/.bin/npm install --omit dev --omit peer --omit optional ${modulesToInstallArgs}`,
        // delete unneeded engines
        ...deleteEngineCmds,
        // internals sux
        `rm -f ${internalsDir}/dist/libquery_engine*`,
        `rm -f ${internalsDir}/dist/get-generators/libquery_engine*`,
        `rm -rf ${internalsDir}/dist/get-generators/engines`,
        // get rid of some junk
        `rm -rf ${engineDir}/download`,
        `rm -rf ${clientDir}/generator-build`,
        `rm -rf ${nm}/@prisma/engine-core/node_modules/@prisma/engines`,
        `rm -rf ${nm}/prisma/build/public`,
        `rm -rf ${nm}/prisma/prisma-client/src/__tests__`,
        `rm -rf ${nm}/prisma/prisma-client/generator-build`,
        `rm -rf ${nm}/@types`,
        `rm -rf ${nm}/.prisma`,
      ].join(' && '),
    ];

    // hash our parameters so we know when we need to rebuild
    const bundleCommandHash = crypto.createHash('sha256');
    bundleCommandHash.update(JSON.stringify(createBundleCommand));
    const bundleCommandDigest = bundleCommandHash.digest('hex');

    // bundle
    const code = Code.fromAsset('.', {
      // don't send all our files to docker (slow)
      ignoreMode: IgnoreMode.GLOB,
      exclude: ['*'],

      // if our bundle commands (basically our "dockerfile") changes then rebuild the image
      assetHashType: AssetHashType.CUSTOM,
      assetHash: bundleCommandDigest,

      bundling: {
        image: RUNTIME.bundlingImage,
        command: createBundleCommand,
        // This is required for the bundling to work in CircleCI
        // https://stackoverflow.com/questions/75714508/aws-cdk-gitlab-ci-runtimeerror-bundling-did-not-produce-any-output-check-tha
        bundlingFileAccess: BundlingFileAccess.VOLUME_COPY,
      },
    });

    super(scope, id, { ...rest, code });

    // hint for prisma to find the engine
    this.environment = {
      PRISMA_QUERY_ENGINE_LIBRARY:
        '/opt/nodejs/node_modules/@prisma/engines/libquery_engine-rhel-openssl-1.0.x.so.node',
    };
    // modules provided by layer
    this.externalModules = [...new Set([...PRISMA_LAYER_EXTERNAL, ...nodeModules])];
  }
}
