Need to use NPM (cannot use PNPM or others) because tfx-cli requires some specific node_modules tree structure. If you see an error like

```
error: Error: EISDIR: illegal operation on a directory, read
```

then try to delete node_modules directory and execute `npm install` again.

If you run into issues with node-gyp rebuild, you can install with `npm install --ignore-scripts` to skip it (although this will skip any install script - but with the current dependencies this is fine).

Creating a new release

1. Checkout dev branch
2. Make changes
3. Update version in ../vss-extension.json and ./task.json
4. Execute ../pack.sh
5. Upload ../build/* to marketplace as dev version
6. Test and verify
7. Merge changes to main, except id and name differences in ../vss-extension.json and ./task.json
8. Execute ../pack.sh
9. Upload ../build/* to marketplace as live version


Link to marketplace item:

https://marketplace.visualstudio.com/items?itemName=haakemon.github-add-pr-comment-if-not-exist

marketplace management:

https://marketplace.visualstudio.com/manage/publishers/haakemon

azure devops dashboard

https://aex.dev.azure.com/me?mkt=en-US
