Need to use NPM (cannot use PNPM or others) because tfx-cli requires some specific node_modules tree structure. If you see an error like

```
error: Error: EISDIR: illegal operation on a directory, read
```

then try to delete node_modules directory and execute `npm install` again.
