rm ./build/*
cd ./src
./node_modules/.bin/tsc
cd ..
./src/node_modules/.bin/tfx extension create --output-path ./build --manifest-globs vss-extension.json
