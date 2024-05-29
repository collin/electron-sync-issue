import { join, resolve } from "path";
import { writeFile, mkdir } from "fs/promises";
import electron from "electron";

electron.app.disableHardwareAcceleration();

const __dirname = resolve(".");

electron.app.on("ready", () => {
  const win = new electron.BrowserWindow({
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    show: false,
    webPreferences: {
      backgroundThrottling: false,
      sandbox: false,
      preload: join(__dirname, "./preload.cjs"),
      offscreen: true,
    },
  });

  win.webContents.on("console-message", (e, level, message) => {
    console.log("(browser)", message);
  });

  win.loadFile(join(__dirname, "index.html"));

  const log = (message) => {
    console.log("   (main)", message);
  };

  const waitForFrameImage = async () => {
    const paintPromise = new Promise((resolve) => {
      win.webContents.once("paint", (_event, _rect, image) => {
        log("Got frame image");
        resolve(image.toPNG());
      });
    });
    log("Invalidating");
    win.webContents.invalidate();
    return await paintPromise;
  };

  const waitForFrame = async (framesToWaitFor) => {
    return new Promise((resolve) => {
      electron.ipcMain.once("ready", () => {
        log("frame ready");
        resolve();
      });
      win.webContents.send("begin", framesToWaitFor);
    });
  };

  const generateFramesWaitingForFrames = async (framesToWaitFor) => {
    const rootPath = join(
      __dirname,
      "./frame-out",
      `waited-${framesToWaitFor}`,
    );
    await mkdir(rootPath, { recursive: true });

    for (let i = 1; i < 10; i++) {
      console.log("----");
      await waitForFrame(framesToWaitFor);
      const png = await waitForFrameImage();
      await writeFile(join(rootPath, `${i}.png`), png);
    }
  };

  win.webContents.on("did-finish-load", async () => {
    win.webContents.setFrameRate(240);
    win.webContents.stopPainting();
    await generateFramesWaitingForFrames(2);
    electron.app.exit();
  });
});
