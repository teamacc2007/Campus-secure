import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

export async function ensureCameraPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const status = await Camera.checkPermissions();
    if (status.camera !== "granted") {
      await Camera.requestPermissions({ permissions: ["camera"] });
    }
  } catch (err) {
    console.warn("Camera permission request error:", err);
  }
}
