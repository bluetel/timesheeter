cp ../lib/src/llm.proto ./src/server/api/llm/.proto

# Path to this plugin
PROTOC_GEN_TS_PATH="./node_modules/.bin/protoc-gen-ts"

# Directory to write generated code to (.js and .d.ts files)
OUT_DIR="./src/server/api/llm"

protoc \
    --plugin="protoc-gen-ts=${PROTOC_GEN_TS_PATH}" \
    --ts_out="." \
    --js_out="import_style=commonjs,binary:." \
    ./src/server/api/llm/.proto

rm ./src/server/api/llm/.proto