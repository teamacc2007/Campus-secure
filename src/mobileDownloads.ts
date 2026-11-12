import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export async function saveOrShareBlob(
  blob: Blob,
  fileName: string,
  _mimeType: string = "application/octet-stream"
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }

  try {
    const reader = new FileReader();
    const base64Data = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = (reader.result as string) || "";
        const comma = result.indexOf(",");
        resolve(comma !== -1 ? result.slice(comma + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Cache,
    });

    await Share.share({
      title: fileName,
      text: `Campus Secure - ${fileName}`,
      url: written.uri,
      dialogTitle: `Save or open ${fileName}`,
    });
  } catch (err) {
    console.warn("Native file save error:", err);
  }
}
