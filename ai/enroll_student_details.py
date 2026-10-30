import os
import json
import cv2
import shutil
import numpy as np
from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder
from ai.matcher import FaceMatcher

def process_and_enroll_student_details():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    extracted_json_path = os.path.join(base_dir, "data/student_details/extracted_records.json")
    if not os.path.exists(extracted_json_path):
        from ai.extract_student_details import extract_and_inspect
        extract_and_inspect()
        
    with open(extracted_json_path, "r") as f:
        records = json.load(f)
        
    public_dest_dir = os.path.join(base_dir, "public/faces/student_details")
    os.makedirs(public_dest_dir, exist_ok=True)
    
    detector = FaceDetector()
    embedder = FaceEmbedder()
    matcher = FaceMatcher()
    
    # Load existing genuine primary identities
    primary_identities = {
        "Sur": ("23MED0412", os.path.join(base_dir, "public/faces/sur.jpg")),
        "Mon": ("23AHS0185", os.path.join(base_dir, "public/faces/mon.jpg")),
        "Mith": ("22ECE0531", os.path.join(base_dir, "public/faces/mith.jpg")),
        "Thiru": ("22CSE0789", os.path.join(base_dir, "public/faces/thiru.jpg")),
    }
    
    primary_embeddings = {}
    for name, (reg, path) in primary_identities.items():
        if os.path.exists(path):
            img_p = cv2.imread(path)
            f_p = sorted(detector.detect_faces(img_p), key=lambda f: f["box"][2] * f["box"][3], reverse=True)[0]
            emb_p = embedder.extract_embedding(img_p, f_p)
            primary_embeddings[name] = (reg, emb_p)
            
    enrolled_embeddings = {}
    for name, (reg, emb_p) in primary_embeddings.items():
        emb_list = emb_p.tolist() if hasattr(emb_p, "tolist") else list(emb_p)
        enrolled_embeddings[name] = emb_list
        enrolled_embeddings[reg] = emb_list
        
    processed_records = []
    duplicate_records = []
    
    for rec in records:
        fields = rec["fields"]
        reg = fields.get("Register Number") or fields.get("Employee ID")
        name = fields.get("Name")
        raw_img_path = rec["image"]
        
        dest_raw_name = f"{reg}.jpg"
        dest_crop_name = f"{reg}_crop.jpg"
        dest_raw_path = os.path.join(public_dest_dir, dest_raw_name)
        dest_crop_path = os.path.join(public_dest_dir, dest_crop_name)
        
        shutil.copyfile(raw_img_path, dest_raw_path)
        img = cv2.imread(raw_img_path)
        faces = detector.detect_faces(img)
        faces.sort(key=lambda f: f["box"][2] * f["box"][3], reverse=True)
        
        if not faces:
            print(f"[ERROR] No face detected for {name} ({reg})")
            continue
            
        primary = faces[0]
        emb = embedder.extract_embedding(img, primary)
        emb_list = emb.tolist() if hasattr(emb, "tolist") else list(emb)
        
        # Check for duplicates against existing valid records
        is_duplicate = False
        duplicate_of = None
        for p_name, (p_reg, p_emb) in primary_embeddings.items():
            sim = matcher.cosine_similarity(emb, p_emb)
            if sim >= 0.85:
                is_duplicate = True
                duplicate_of = (p_name, p_reg, round(sim, 4))
                break
                
        # Save cropped face
        x, y, w, h = primary["box"]
        pad_x = int(w * 0.25)
        pad_y = int(h * 0.25)
        img_h, img_w = img.shape[:2]
        x1 = max(0, x - pad_x)
        y1 = max(0, y - pad_y)
        x2 = min(img_w, x + w + pad_x)
        y2 = min(img_h, y + h + pad_y)
        crop = img[y1:y2, x1:x2]
        cv2.imwrite(dest_crop_path, crop)
        
        if is_duplicate:
            print(f"[DUPLICATE PREVENTED] {name} ({reg}) matches existing valid record '{duplicate_of[0]}' ({duplicate_of[1]}) with similarity {duplicate_of[2]}. Preserving primary record.")
            duplicate_records.append({
                "identifier": reg,
                "name": name,
                "duplicate_of": duplicate_of[0],
                "duplicate_of_reg": duplicate_of[1],
                "similarity": duplicate_of[2]
            })
            continue
            
        # Independent enrolled identity
        enrolled_embeddings[reg] = emb_list
        enrolled_embeddings[name] = emb_list
        
        processed_records.append({
            "identifier": reg,
            "name": name,
            "photo_url": f"/faces/student_details/{dest_crop_name}",
            "raw_photo_url": f"/faces/student_details/{dest_raw_name}",
            "embedding": emb_list,
            "fields": fields
        })
        print(f"Enrolled independent identity {name} ({reg}) - landmarks: {len(primary['landmarks'])}, emb len: {len(emb_list)}")
        
    embeddings_file = os.path.join(base_dir, "public/faces/enrolled_embeddings.json")
    with open(embeddings_file, "w") as f:
        json.dump(enrolled_embeddings, f, indent=2)
    print(f"Updated {embeddings_file} with {len(enrolled_embeddings)} verified entries (duplicates excluded).")
    
    with open(os.path.join(base_dir, "data/student_details/processed_enrollment.json"), "w") as f:
        json.dump({
            "enrolled": processed_records,
            "duplicates_prevented": duplicate_records
        }, f, indent=2)

if __name__ == "__main__":
    process_and_enroll_student_details()
