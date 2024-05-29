const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("API", {
  onBegin: (callback) => {
    ipcRenderer.on("begin", (_event, framesToWaitFor) => {
      callback(framesToWaitFor);
    });
  },
  ready: () => {
    ipcRenderer.send("ready");
  },
});
