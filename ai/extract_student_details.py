import os
import zipfile
import json
import cv2
import docx
from ai.detector import FaceDetector
from ai.embedder import FaceEmbedder

def extract_and_inspect():
    docx_path = r"A:\Downloads\Student_Details.docx"
    if not os.path.exists(docx_path):
        # fallback search
        for root in [r"C:\Users\Sharan Mathav\Downloads", r"D:\Downloads", r"."]:
            p = os.path.join(root, "Student_Details.docx")
            if os.path.exists(p):
                docx_path = p
                break
                
    print(f"Reading docx from {docx_path}")
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/student_details"))
    os.makedirs(out_dir, exist_ok=True)
    
    # Also save a copy of the docx in data/
    import shutil
    shutil.copyfile(docx_path, os.path.join(out_dir, "Student_Details.docx"))
    
    z = zipfile.ZipFile(docx_path)
    doc = docx.Document(docx_path)
    detector = FaceDetector()
    embedder = FaceEmbedder()
    
    records = []
    for i, table in enumerate(doc.tables):
        title = table.rows[0].cells[0].text.strip()
        cell0 = table.rows[1].cells[0]
        blips = cell0._tc.xpath('.//a:blip/@r:embed')
        media_path = None
        if blips:
            rid = blips[0]
            target = doc.part.rels[rid].target_ref
            target_in_zip = "word/" + target if not target.startswith("word/") else target
            clean_title = title.lower().replace(" ", "_")
            out_name = f"{clean_title}.jpg"
            out_path = os.path.join(out_dir, out_name)
            with open(out_path, "wb") as f_out:
                f_out.write(z.read(target_in_zip))
            media_path = out_path
            
        fields = {}
        for row in table.rows[1:]:
            k = row.cells[1].text.strip()
            v = row.cells[2].text.strip()
            if k:
                fields[k] = v
                
        img = cv2.imread(media_path) if media_path else None
        faces = detector.detect_faces(img) if img is not None else []
        landmarks_count = len(faces[0]["landmarks"]) if faces else 0
        embedding = None
        if faces:
            aligned = detector.align_face(img, faces[0])
            embedding = embedder.extract_embedding(aligned)
            
        records.append({
            "title": title,
            "image": media_path,
            "image_size": [img.shape[1], img.shape[0]] if img is not None else None,
            "faces_detected": len(faces),
            "landmarks_count": landmarks_count,
            "embedding_len": len(embedding) if embedding is not None else 0,
            "fields": fields
        })
        
    print(json.dumps(records, indent=2))
    with open(os.path.join(out_dir, "extracted_records.json"), "w") as f:
        json.dump(records, f, indent=2)

if __name__ == "__main__":
    extract_and_inspect()
