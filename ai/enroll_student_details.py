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
    
    # Helper to generate multiple reference templates covering crop, full, mirroring, and lighting variations
    def generate_templates(crop_path, raw_path=None):
        temps = []
        if crop_path and os.path.exists(crop_path):
            c_img = cv2.imread(crop_path)
            if c_img is not None:
                fc = detector.detect_faces(c_img)
                if fc:
                    temps.append(embedder.extract_embedding(c_img, fc[0]).tolist())
                    c_flip = cv2.flip(c_img, 1)
                    fc_flip = detector.detect_faces(c_flip)
                    if fc_flip:
                        temps.append(embedder.extract_embedding(c_flip, fc_flip[0]).tolist())
        if raw_path and os.path.exists(raw_path):
            r_img = cv2.imread(raw_path)
            if r_img is not None:
                fr = detector.detect_faces(r_img)
                if fr:
                    temps.append(embedder.extract_embedding(r_img, fr[0]).tolist())
                    r_flip = cv2.flip(r_img, 1)
                    fr_flip = detector.detect_faces(r_flip)
                    if fr_flip:
                        temps.append(embedder.extract_embedding(r_flip, fr_flip[0]).tolist())
                    for a, b in [(1.15, 12), (0.85, -12)]:
                        adj = cv2.convertScaleAbs(r_img, alpha=a, beta=b)
                        f_adj = detector.detect_faces(adj)
                        if f_adj:
                            temps.append(embedder.extract_embedding(adj, f_adj[0]).tolist())
        return temps

    # Load existing genuine primary identities with multi-reference templates
    primary_identities = {
        "Sur": ("23MED0412", os.path.join(base_dir, "public/faces/sur_crop.jpg"), os.path.join(base_dir, "public/faces/sur.jpg")),
        "Mon": ("23AHS0185", os.path.join(base_dir, "public/faces/mon_crop.jpg"), os.path.join(base_dir, "public/faces/mon.jpg")),
        "Mith": ("22ECE0531", os.path.join(base_dir, "public/faces/mith_crop.jpg"), os.path.join(base_dir, "public/faces/mith.jpg")),
        "Thiru": ("22CSE0789", os.path.join(base_dir, "public/faces/thiru_crop.jpg"), os.path.join(base_dir, "public/faces/thiru.jpg")),
    }

    primary_embeddings = {}
    enrolled_embeddings = {}
    for name, (reg, crop_p, full_p) in primary_identities.items():
        temps = generate_templates(crop_p, full_p)
        if temps:
            primary_embeddings[name] = (reg, np.array(temps[0], dtype=np.float32))
            enrolled_embeddings[name] = temps
            enrolled_embeddings[reg] = temps
            print(f"Generated {len(temps)} reference templates for primary identity {name} ({reg})")
        
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
            
        # Independent enrolled identity with multi-reference templates
        doc_temps = generate_templates(dest_crop_path, dest_raw_path)
        if not doc_temps:
            doc_temps = [emb_list]
        enrolled_embeddings[reg] = doc_temps
        enrolled_embeddings[name] = doc_temps
        
        processed_records.append({
            "identifier": reg,
            "name": name,
            "photo_url": f"/faces/student_details/{dest_crop_name}",
            "raw_photo_url": f"/faces/student_details/{dest_raw_name}",
            "embedding": doc_temps,
            "fields": fields
        })
        print(f"Enrolled independent identity {name} ({reg}) - {len(doc_temps)} templates generated")
        
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
