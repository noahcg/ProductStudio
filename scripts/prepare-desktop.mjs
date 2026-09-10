import { cp, mkdir, rm, stat } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFile = promisify(execFileCallback);
const root = process.cwd();
const staging = path.join(root, "desktop-dist", "server");
const standalone = path.join(root, ".next", "standalone");
const iconSource = path.join(root, "public", "images", "app-icon.png");
const iconSet = path.join(root, "desktop-dist", "app-icon.iconset");
const desktopIcon = path.join(root, "desktop-dist", "app-icon.icns");

async function copyIfPresent(source, destination) {
  try {
    await stat(source);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function createMacIcon() {
  const sizes = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"],
  ];

  await mkdir(iconSet, { recursive: true });
  await Promise.all(sizes.map(([size, filename]) => execFile(
    "sips",
    ["-z", String(size), String(size), iconSource, "--out", path.join(iconSet, filename)],
  )));
  await execFile("iconutil", ["-c", "icns", iconSet, "-o", desktopIcon]);
}

await rm(path.join(root, "desktop-dist"), { recursive: true, force: true });
await cp(standalone, staging, { recursive: true });
await copyIfPresent(path.join(root, ".next", "static"), path.join(staging, ".next", "static"));
await copyIfPresent(path.join(root, "public"), path.join(staging, "public"));
await createMacIcon();
console.log("Prepared Electron's local Next server and macOS app icon in desktop-dist.");
