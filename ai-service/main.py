from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import os
import uuid
from sentence_transformers import SentenceTransformer, util
import torch

app = FastAPI()

model_name = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
model = SentenceTransformer(model_name)

class AnalyzeRequest(BaseModel):
    grievanceId: str
    text: str

class Prediction(BaseModel):
    departmentCode: str
    taxonomyCode: str
    confidence: float

class AnalyzeResponse(BaseModel):
    grievanceId: str
    provider: str = "sentence-transformer"
    modelVersion: str = "multilingual-minilm-v1"
    taxonomyCode: str
    departmentCode: str
    confidence: float
    priority: str
    priorityReason: str
    urgentReasons: List[str]
    explanation: str
    topPredictions: List[Prediction]
    decision: str
    requiresHumanReview: bool

TAXONOMY = [
    {"code": "ROADS.POTHOLE", "dept": "ROADS", "desc": "Potholes on the road, broken roads, accident risk, damaged road, cracks on highway",
     "keywords": ["pothole", "road", "highway", "crack", "गड्ढा", "सड़क", "रास्ता", "टूटी सड़क", "खड्डा", "रस्ता"]},
    {"code": "SANITATION.SEWER", "dept": "SANITATION", "desc": "Sewer overflow, drainage issue, garbage on street, dirty area, waste dump",
     "keywords": ["sewer", "garbage", "drain", "waste", "dirty", "गंदगी", "नाला", "कचरा", "सफाई", "गटर", "कचरा"]},
    {"code": "ELECTRICITY.OUTAGE", "dept": "ELECTRICITY", "desc": "Power cut, no electricity, broken wire, sparking, transformer issue, streetlight not working",
     "keywords": ["electricity", "power", "wire", "sparking", "transformer", "बिजली", "करंट", "तार", "बत्ती", "विद्युत", "लाइट"]},
    {"code": "WATER.NO_SUPPLY", "dept": "WATER", "desc": "No water supply, dirty water, pipeline leak, water contamination, low pressure",
     "keywords": ["water", "pipeline", "leak", "supply", "contamination", "पानी", "जल", "नल", "पाइप", "टंकी", "पाणी"]},
    {"code": "PUBLIC_SERVICES.OTHER", "dept": "PUBLIC_SERVICES", "desc": "Other general public service issues, government office, public facility",
     "keywords": ["office", "service", "public", "government", "सरकारी", "कार्यालय", "सेवा"]}
]

# Pre-compute embeddings
tax_texts = [t["desc"] for t in TAXONOMY]
tax_embeddings = model.encode(tax_texts, convert_to_tensor=True)

# Multilingual safety/emergency keywords
EMERGENCY_KEYWORDS = [
    # English
    "emergency", "accident", "sparking", "electrocution", "fire", "collapse",
    "death", "dying", "life threatening", "danger", "fatal", "explosion",
    # Hindi
    "आपातकाल", "दुर्घटना", "करंट लगा", "आग", "धमाका", "ढह गया",
    "मौत", "जान का खतरा", "खतरनाक", "बिजली का झटका",
    # Marathi
    "अपघात", "आग लागली", "धोका", "विजेचा धक्का", "जीवघेणा"
]

HIGH_PRIORITY_KEYWORDS = [
    # English
    "urgent", "serious", "flooding", "sewage overflow", "major leak",
    "broken main", "no water for days", "children affected", "hospital",
    # Hindi
    "जरूरी", "गंभीर", "बाढ़", "गंदा पानी", "टूटा पाइप",
    "बच्चों को खतरा", "अस्पताल",
    # Marathi
    "तातडी", "गंभीर", "पूर", "मुलांना धोका"
]

@app.get("/health")
def health():
    return {"status": "up"}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    emb = model.encode(req.text, convert_to_tensor=True)
    cosine_scores = util.cos_sim(emb, tax_embeddings)[0]
    
    results = []
    for i, score in enumerate(cosine_scores):
        results.append({
            "code": TAXONOMY[i]["code"],
            "dept": TAXONOMY[i]["dept"],
            "score": score.item()
        })
    
    results.sort(key=lambda x: x["score"], reverse=True)
    top3 = results[:3]
    
    best = top3[0]
    confidence = best["score"]
    
    # Priority detection with multilingual keywords
    priority = "NORMAL"
    priorityReason = ""
    urgentReasons = []
    
    text_lower = req.text.lower()
    
    # Check for EMERGENCY
    for kw in EMERGENCY_KEYWORDS:
        if kw.lower() in text_lower:
            priority = "EMERGENCY"
            priorityReason = f"Detected safety keyword: '{kw}'."
            urgentReasons.append(f"unsafe condition: {kw}")
            break
    
    # Check for HIGH if not already EMERGENCY
    if priority == "NORMAL":
        for kw in HIGH_PRIORITY_KEYWORDS:
            if kw.lower() in text_lower:
                priority = "HIGH"
                priorityReason = f"Detected urgency keyword: '{kw}'."
                break
        
    ai_auto_route_threshold = float(os.environ.get("AI_AUTO_ROUTE_THRESHOLD", 0.85))
    ai_review_threshold = float(os.environ.get("AI_REVIEW_THRESHOLD", 0.55))
    
    decision = "AUTO_ROUTE"
    requiresHumanReview = False
    
    if priority == "EMERGENCY":
        decision = "EMERGENCY_REVIEW"
        requiresHumanReview = True
    elif confidence >= ai_auto_route_threshold:
        decision = "AUTO_ROUTE"
    elif confidence >= ai_review_threshold:
        decision = "HUMAN_REVIEW"
        requiresHumanReview = True
    else:
        decision = "ABSTAIN"
        requiresHumanReview = True
        
    # Close margin check
    if len(top3) > 1 and (top3[0]["score"] - top3[1]["score"]) < 0.08:
        if decision == "AUTO_ROUTE":
            decision = "HUMAN_REVIEW"
            requiresHumanReview = True

    preds = [Prediction(departmentCode=r["dept"], taxonomyCode=r["code"], confidence=round(r["score"], 4)) for r in top3]

    # Build specific explanation
    explanation = f"The complaint is most similar to the '{best['code']}' category "
    explanation += f"with {confidence:.1%} confidence based on semantic similarity analysis."

    return AnalyzeResponse(
        grievanceId=req.grievanceId,
        taxonomyCode=best["code"],
        departmentCode=best["dept"],
        confidence=round(confidence, 4),
        priority=priority,
        priorityReason=priorityReason,
        urgentReasons=urgentReasons,
        explanation=explanation,
        topPredictions=preds,
        decision=decision,
        requiresHumanReview=requiresHumanReview
    )
