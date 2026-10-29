"""
Helper script to download official pre-trained ONNX models for face detection (YuNet)
and face recognition (SFace / MobileFaceNet) if they are not already present.
"""
import os
import urllib.request

MODELS_DIR = os.path.dirname(__file__) + "/models"

MODELS = {
    "face_detection_yunet_2023mar.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
}

def ensure_models():
    os.makedirs(MODELS_DIR, exist_ok=True)
    for filename, url in MODELS.items():
        filepath = os.path.join(MODELS_DIR, filename)
        if not os.path.exists(filepath) or os.path.getsize(filepath) < 1000:
            print(f"Downloading {filename} from {url}...")
            urllib.request.urlretrieve(url, filepath)
            print(f"Downloaded {filename} ({os.path.getsize(filepath)} bytes).")
        else:
            print(f"Model already present: {filename} ({os.path.getsize(filepath)} bytes).")
            
    # Also provide arcface_mobilefacenet.onnx alias if needed
    arc_path = os.path.join(MODELS_DIR, "arcface_mobilefacenet.onnx")
    sface_path = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")
    if not os.path.exists(arc_path) and os.path.exists(sface_path):
        import shutil
        shutil.copyfile(sface_path, arc_path)
        print("Created arcface_mobilefacenet.onnx alias.")

if __name__ == "__main__":
    ensure_models()
