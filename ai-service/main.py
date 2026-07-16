from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import tempfile
import threading
import uuid

app = FastAPI()

MAX_AUDIO_BYTES = int(os.environ.get("STT_MAX_AUDIO_MB", "15")) * 1024 * 1024
STT_MODEL_SIZE = os.environ.get("STT_MODEL_SIZE", "small")
STT_DEVICE = os.environ.get("STT_DEVICE", "cpu")
STT_COMPUTE_TYPE = os.environ.get("STT_COMPUTE_TYPE", "int8")
STT_SUPPORTED_LANGUAGES = {
    "auto": None,
    "en": "en", "as": "as", "bn": "bn", "gu": "gu", "hi": "hi",
    "kn": "kn", "ml": "ml", "mr": "mr", "ne": "ne", "pa": "pa",
    "sa": "sa", "sd": "sd", "ta": "ta", "te": "te", "ur": "ur",
}
_stt_model = None
_stt_model_lock = threading.Lock()
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash").strip()
_gemini_client = None
_gemini_client_lock = threading.Lock()


def get_stt_model():
    global _stt_model
    if _stt_model is None:
        with _stt_model_lock:
            if _stt_model is None:
                from faster_whisper import WhisperModel
                _stt_model = WhisperModel(
                    STT_MODEL_SIZE,
                    device=STT_DEVICE,
                    compute_type=STT_COMPUTE_TYPE,
                    download_root=os.environ.get("STT_MODEL_CACHE", "/models"),
                )
    return _stt_model

def get_gemini_client():
    global _gemini_client
    if not GEMINI_API_KEY:
        return None
    if _gemini_client is None:
        with _gemini_client_lock:
            if _gemini_client is None:
                from google import genai
                _gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    return _gemini_client

class AnalyzeRequest(BaseModel):
    grievanceId: str
    text: str

class Prediction(BaseModel):
    departmentCode: str
    taxonomyCode: str
    confidence: float

class AnalyzeResponse(BaseModel):
    grievanceId: str
    provider: str = "gemini"
    modelVersion: str = GEMINI_MODEL
    taxonomyCode: str
    departmentCode: str
    confidence: float
    priority: str
    priorityReason: str
    detectedLanguage: str
    sentiment: str
    severityScore: int
    urgentReasons: List[str]
    explanation: str
    topPredictions: List[Prediction]
    decision: str
    requiresHumanReview: bool


class GeminiClassification(BaseModel):
    departmentCode: str
    taxonomyCode: str
    confidence: float = Field(ge=0, le=1)
    priority: str
    priorityReason: str
    detectedLanguage: str
    sentiment: str
    severityScore: int = Field(ge=0, le=100)
    urgentReasons: List[str] = []
    explanation: str

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

# Ordered, high-specificity phrases resolve common collisions before generic
# keyword/semantic scoring (for example water overflow vs road waterlogging).
ROUTING_OVERRIDES = [
    (("live wire", "exposed wire", "hanging wire", "open electrical wire"), "ELECTRICITY.LIVE_WIRE", "ELECTRICITY"),
    (("street light", "streetlight", "lamp post not working"), "ELECTRICITY.STREETLIGHT", "ELECTRICITY"),
    (("pipe burst", "burst pipe", "water main burst", "water gushing", "pipeline leak"), "WATER.PIPE_LEAK", "WATER"),
    (("sewage mixing", "sewage in drinking water", "sewage in water"), "WATER.SEWAGE_MIXING", "WATER"),
    (("garbage not collected", "waste not collected"), "SANITATION.COLLECTION", "SANITATION"),
    (("blocked drain", "sewer overflow", "sewage overflow", "gutter blocked"), "SANITATION.SEWER", "SANITATION"),
    (("fogging request", "mosquito fogging"), "SANITATION.MOSQUITO", "SANITATION"),
    (("dengue", "disease outbreak", "many people sick"), "HEALTH.DENGUE", "HEALTH"),
    (("illegal construction", "unauthorized building", "building collapse", "collapse risk"), "BUILDING_URBAN_PLANNING.ILLEGAL_CONSTRUCTION", "BUILDING_URBAN_PLANNING"),
    (("railway crossing", "rail signal", "railway signal"), "TRANSPORT.RAIL_CROSSING", "TRANSPORT"),
    (("railway station", "train station", "rail platform"), "TRANSPORT.SERVICE_DELAY", "TRANSPORT"),
    (("bus stop", "bus shelter"), "TRANSPORT.BUS_STOP", "TRANSPORT"),
    (("traffic signal", "traffic light"), "PUBLIC_SAFETY.TRAFFIC_SIGNAL", "PUBLIC_SAFETY"),
    (("pothole", "road crater"), "ROADS.POTHOLE", "ROADS"),
]

# Governed civic taxonomy used by both the instant offline router and the optional semantic model.
# Each complaint type supplied by the product specification has an explicit destination.
DEPARTMENT_CATALOG = {
    "ROADS": [
        ("POTHOLE", "Potholes and dangerous road craters", ["pothole", "road hole", "गड्ढा", "खड्डा"]),
        ("FOOTPATH", "Broken or uneven footpaths", ["footpath", "sidewalk", "pavement", "फुटपाथ"]),
        ("DIVIDER", "Damaged road dividers or railings", ["road divider", "railing", "median"]),
        ("MANHOLE", "Missing or broken manhole covers", ["manhole", "open chamber", "missing cover"]),
        ("SPEED_BREAKER", "Broken, illegal or unauthorized speed breakers", ["speed breaker", "speed bump"]),
        ("WATERLOGGING", "Waterlogging or flooding on roads", ["waterlogging", "water logged", "road flooding", "जलभराव"]),
        ("BRIDGE", "Damaged bridges or flyovers", ["bridge damage", "flyover damage", "bridge crack"]),
        ("DEBRIS", "Road construction debris left behind", ["construction debris", "road debris", "rubble"]),
    ],
    "WATER": [
        ("NO_SUPPLY", "No water supply or low pressure", ["no water", "low pressure", "water supply", "पानी नहीं", "पाणी नाही"]),
        ("CONTAMINATION", "Contaminated or dirty drinking water", ["dirty water", "contaminated water", "brown water", "गंदा पानी"]),
        ("PIPE_LEAK", "Pipe leakage or burst water main", ["pipe leak", "pipeline leak", "pipe burst", "water leak"]),
        ("ILLEGAL_CONNECTION", "Illegal water connections", ["illegal water connection", "unauthorized connection"]),
        ("TANKER", "Water tanker delay", ["water tanker", "tanker delay"]),
        ("SEWAGE_MIXING", "Sewage mixing with drinking water", ["sewage in water", "sewage mixing", "foul water"]),
        ("PUBLIC_TAP", "Broken public water taps or handpumps", ["public tap", "broken tap", "handpump"]),
    ],
    "ELECTRICITY": [
        ("OUTAGE", "Power outage or electricity failure", ["power outage", "power cut", "no electricity", "बिजली नहीं", "वीज नाही"]),
        ("STREETLIGHT", "Streetlight not working", ["streetlight", "street light", "lamp post"]),
        ("LIVE_WIRE", "Exposed or hanging live electrical wires", ["live wire", "exposed wire", "hanging wire", "open wire"]),
        ("POLE", "Damaged electric poles", ["electric pole", "damaged pole", "fallen pole"]),
        ("TRANSFORMER", "Transformer issue, fire or sparking", ["transformer", "sparking", "electric fire"]),
        ("BILLING", "Electricity billing or meter complaints", ["electricity bill", "wrong bill", "meter complaint", "faulty meter"]),
        ("VOLTAGE", "Frequent voltage fluctuation", ["voltage fluctuation", "low voltage", "high voltage"]),
    ],
    "SANITATION": [
        ("COLLECTION", "Garbage not collected", ["garbage not collected", "waste not collected", "कचरा नहीं उठाया", "कचरा उचलला नाही"]),
        ("OVERFLOW", "Overflowing dustbins or garbage dumps", ["overflowing dustbin", "garbage dump", "trash pile"]),
        ("ILLEGAL_DUMPING", "Illegal dumping of waste", ["illegal dumping", "dumping waste"]),
        ("PUBLIC_TOILET", "Public toilet cleanliness or damage", ["public toilet", "dirty toilet", "broken toilet"]),
        ("SEWER", "Drain or sewer blockage and overflow", ["sewer", "blocked drain", "gutter", "drainage", "नाला", "गटर"]),
        ("OPEN_DEFECATION", "Open defecation spot", ["open defecation"]),
        ("DEAD_ANIMAL", "Dead animal removal", ["dead animal", "animal carcass"]),
        ("MOSQUITO", "Mosquito breeding or fogging request", ["mosquito", "fogging", "dengue breeding"]),
    ],
    "PUBLIC_SAFETY": [
        ("CRIME_HARASSMENT", "Street crime or harassment reports", ["street crime", "harassment", "unsafe street", "molestation"]),
        ("ILLEGAL_PARKING", "Illegal parking", ["illegal parking", "wrong parking", "blocked by car"]),
        ("TRAFFIC_SIGNAL", "Traffic signal malfunction", ["traffic signal", "traffic light", "signal not working"]),
        ("ENCROACHMENT", "Unauthorized construction or encroachment", ["encroachment", "unauthorized construction", "blocked public land"]),
        ("HAWKERS", "Illegal hawkers or vendors blocking paths", ["illegal hawker", "vendor blocking", "hawker encroachment"]),
        ("STRAY_ANIMAL", "Stray dog or animal menace", ["stray dog", "dog menace", "stray animal", "animal attack"]),
        ("NOISE", "Noise pollution complaints", ["noise pollution", "loudspeaker", "loud music"]),
        ("FIRE_HAZARD", "Fire hazard reports", ["fire hazard", "fire risk", "gas leak", "smoke"]),
    ],
    "PARKS_HORTICULTURE": [
        ("PARK_MAINTENANCE", "Damaged or unmaintained public parks", ["public park", "park damaged", "park maintenance"]),
        ("FALLEN_TREE", "Fallen trees or dangerous branches", ["fallen tree", "tree branch", "dangerous tree"]),
        ("PLAYGROUND", "Broken playground equipment", ["playground equipment", "broken swing", "broken slide"]),
        ("TREE_CUTTING", "Illegal tree cutting", ["tree cutting", "cutting trees", "illegal tree"]),
        ("GREEN_ENCROACHMENT", "Encroachment on green spaces", ["green space encroachment", "park encroachment"]),
    ],
    "HEALTH": [
        ("OUTBREAK", "Disease outbreak reports", ["disease outbreak", "many people sick", "infection spread"]),
        ("FOOD_VENDOR", "Unhygienic food vendors", ["unhygienic food", "dirty food vendor", "stale food"]),
        ("DENGUE", "Mosquito or dengue breeding sites", ["dengue", "mosquito breeding", "stagnant water"]),
        ("ILLEGAL_PRACTICE", "Illegal medical practice", ["illegal doctor", "fake doctor", "illegal clinic"]),
        ("AMBULANCE", "Ambulance or emergency response delays", ["ambulance delay", "ambulance not coming", "emergency response delay"]),
    ],
    "BUILDING_URBAN_PLANNING": [
        ("ILLEGAL_CONSTRUCTION", "Illegal construction", ["illegal construction", "unauthorized building"]),
        ("SAFETY_HAZARD", "Building cracks or collapse risk", ["building crack", "collapse risk", "unsafe building", "building collapse"]),
        ("LAND_ENCROACHMENT", "Encroachment on public land", ["public land encroachment", "land grabbed"]),
        ("CODE_VIOLATION", "Violation of building codes", ["building code", "code violation", "illegal floor"]),
        ("HOARDING", "Unauthorized signage or hoardings", ["illegal hoarding", "unauthorized signage", "billboard"]),
    ],
    "TRANSPORT": [
        ("BUS_STOP", "Bus stop damage or missing shelter", ["bus stop", "missing shelter", "damaged bus shelter"]),
        ("SERVICE_DELAY", "Public transport delays or overcrowding", ["bus delay", "transport delay", "overcrowded bus", "public transport"]),
        ("METER_FRAUD", "Auto or taxi meter fraud", ["meter fraud", "taxi meter", "auto meter", "overcharging taxi"]),
        ("ROUTE_PARKING", "Illegal parking on public transport routes", ["bus route blocked", "parking on bus route"]),
        ("RAIL_CROSSING", "Damaged railway crossing or signals", ["railway crossing", "rail signal", "crossing damaged"]),
    ],
    "PUBLIC_SERVICES": [
        ("OTHER", "Other or general civic grievance", ["other issue", "general complaint", "public service"]),
    ],
}

# Unicode escapes keep Hindi/Marathi aliases intact when this project is copied
# through Windows shells. They extend the same governed taxonomy as English.
MULTILINGUAL_ALIASES = {
    ("ROADS", "POTHOLE"): ["\u0917\u0921\u094d\u0922\u093e", "\u0916\u0921\u094d\u0921\u093e", "\u0930\u0938\u094d\u0924\u093e \u0924\u0941\u091f\u0932\u093e", "\u0938\u0921\u093c\u0915 \u091f\u0942\u091f\u0940"],
    ("ROADS", "WATERLOGGING"): ["\u091c\u0932\u092d\u0930\u093e\u0935", "\u0930\u0938\u094d\u0924\u094d\u092f\u093e\u0935\u0930 \u092a\u093e\u0923\u0940"],
    ("WATER", "NO_SUPPLY"): ["\u092a\u093e\u0928\u0940 \u0928\u0939\u0940\u0902", "\u092a\u093e\u0923\u0940 \u0928\u093e\u0939\u0940", "\u0915\u092e \u0926\u092c\u093e\u0935"],
    ("WATER", "CONTAMINATION"): ["\u0917\u0902\u0926\u093e \u092a\u093e\u0928\u0940", "\u0917\u0902\u0926\u0947 \u092a\u093e\u0928\u0940", "\u0917\u0922\u0942\u0933 \u092a\u093e\u0923\u0940", "\u0926\u0942\u0937\u093f\u0924 \u092a\u093e\u0923\u0940"],
    ("WATER", "PIPE_LEAK"): ["\u092a\u093e\u0907\u092a \u0932\u0940\u0915", "\u092a\u093e\u0908\u092a \u092b\u0941\u091f\u0932\u093e", "\u092a\u093e\u0928\u0940 \u0932\u0940\u0915"],
    ("ELECTRICITY", "OUTAGE"): ["\u092c\u093f\u091c\u0932\u0940 \u0928\u0939\u0940\u0902", "\u0935\u0940\u091c \u0928\u093e\u0939\u0940", "\u0932\u093e\u0907\u091f \u0928\u0939\u0940\u0902"],
    ("ELECTRICITY", "LIVE_WIRE"): ["live electrical wire", "\u0916\u0941\u0932\u093e \u092c\u093f\u091c\u0932\u0940 \u0915\u093e \u0924\u093e\u0930", "\u0932\u091f\u0915\u0924\u0940 \u0924\u093e\u0930", "\u0935\u093f\u091c\u0947\u091a\u0940 \u0924\u093e\u0930"],
    ("SANITATION", "COLLECTION"): ["\u0915\u091a\u0930\u093e", "\u0915\u091a\u0930\u093e \u0928\u0939\u0940\u0902 \u0909\u0920\u093e\u092f\u093e", "\u0915\u091a\u0930\u093e \u0909\u091a\u0932\u0932\u093e \u0928\u093e\u0939\u0940", "\u0915\u091a\u0930\u093e \u0909\u091a\u0932\u0932\u0947\u0932\u093e \u0928\u093e\u0939\u0940"],
    ("SANITATION", "SEWER"): ["\u0928\u093e\u0932\u093e \u092c\u0902\u0926", "\u0917\u091f\u0930 \u0924\u0941\u0902\u092c\u0932\u0947", "\u0938\u0940\u0935\u0930 \u092c\u094d\u0932\u0949\u0915"],
    ("PUBLIC_SAFETY", "ILLEGAL_PARKING"): ["\u0917\u0932\u0924 \u092a\u093e\u0930\u094d\u0915\u093f\u0902\u0917", "\u092c\u0947\u0915\u093e\u092f\u0926\u093e \u092a\u093e\u0930\u094d\u0915\u093f\u0902\u0917"],
    ("PUBLIC_SAFETY", "STRAY_ANIMAL"): ["\u0906\u0935\u093e\u0930\u093e \u0915\u0941\u0924\u094d\u0924\u0947", "\u092d\u091f\u0915\u0947 \u0915\u0941\u0924\u094d\u0924\u0947"],
    ("PARKS_HORTICULTURE", "TREE_CUTTING"): ["\u092a\u0947\u0921\u093c \u0915\u093e\u091f\u0928\u093e", "\u091d\u093e\u0921 \u0915\u093e\u092a\u0923\u0947", "\u0905\u0935\u0948\u0927 \u0935\u0943\u0915\u094d\u0937\u0924\u094b\u0921"],
    ("HEALTH", "DENGUE"): ["\u0921\u0947\u0902\u0917\u0942", "\u0921\u093e\u0938\u093e\u0902\u091a\u0940 \u092a\u0948\u0926\u093e\u0938", "\u092e\u091a\u094d\u091b\u0930"],
    ("BUILDING_URBAN_PLANNING", "ILLEGAL_CONSTRUCTION"): ["\u0905\u0935\u0948\u0927 \u0928\u093f\u0930\u094d\u092e\u093e\u0923", "\u092c\u0947\u0915\u093e\u092f\u0926\u093e \u092c\u093e\u0902\u0927\u0915\u093e\u092e"],
    ("TRANSPORT", "BUS_STOP"): ["\u092c\u0938 \u0938\u094d\u091f\u0949\u092a", "\u092c\u0938 \u0925\u093e\u0902\u092c\u093e", "\u092c\u0938 \u0936\u0947\u0932\u094d\u091f\u0930"],
}

for (department, code), aliases in MULTILINGUAL_ALIASES.items():
    for item_code, _description, keywords in DEPARTMENT_CATALOG[department]:
        if item_code == code:
            keywords.extend(aliases)
            break

TAXONOMY = [
    {"code": f"{department}.{code}", "dept": department, "desc": description, "keywords": keywords}
    for department, issues in DEPARTMENT_CATALOG.items()
    for code, description, keywords in issues
]

# Multilingual safety/emergency keywords
EMERGENCY_KEYWORDS = [
    # English
    "emergency", "accident", "sparking", "electrocution", "fire", "collapse", "gas leak",
    "live wire", "exposed wire", "hanging wire", "building collapse", "ambulance delay",
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
    "broken main", "pipe burst", "burst pipe", "water overflow", "water gushing",
    "no water for days", "children affected", "hospital",
    # Hindi
    "जरूरी", "गंभीर", "बाढ़", "गंदा पानी", "टूटा पाइप",
    "बच्चों को खतरा", "अस्पताल",
    # Marathi
    "तातडी", "गंभीर", "पूर", "मुलांना धोका"
]

FRUSTRATION_KEYWORDS = [
    "frustrated", "angry", "fed up", "no one is listening", "many complaints",
    "still not fixed", "terrible", "unacceptable", "please help immediately",
    "\u092c\u0939\u0941\u0924 \u092a\u0930\u0947\u0936\u093e\u0928", "\u0915\u094b\u0908 \u0938\u0941\u0928 \u0928\u0939\u0940\u0902 \u0930\u0939\u093e", "\u092e\u0926\u0926 \u0915\u0930\u094b",
    "\u0916\u0942\u092a \u0924\u094d\u0930\u093e\u0938", "\u0915\u094b\u0923\u0940\u0939\u0940 \u0910\u0915\u0924 \u0928\u093e\u0939\u0940", "\u0924\u093e\u0924\u0921\u0940\u0928\u0947 \u092e\u0926\u0924"
]

CALM_KEYWORDS = ["please check", "when possible", "request you", "kindly", "minor issue"]

def detect_language(text: str) -> str:
    if any('\u0900' <= char <= '\u097f' for char in text):
        return "Hindi / Marathi"
    if any('\u0a80' <= char <= '\u0aff' for char in text):
        return "Gujarati"
    if any('\u0b80' <= char <= '\u0bff' for char in text):
        return "Tamil"
    if any('\u0c00' <= char <= '\u0c7f' for char in text):
        return "Telugu"
    if any('\u0c80' <= char <= '\u0cff' for char in text):
        return "Kannada"
    if any('\u0980' <= char <= '\u09ff' for char in text):
        return "Bengali"
    return "English"

@app.get("/health")
def health():
    return {
        "status": "up",
        "classifierProvider": "gemini" if GEMINI_API_KEY else "offline-multilingual-router",
        "classifierModel": GEMINI_MODEL if GEMINI_API_KEY else "multilingual-rules-v3",
        "geminiConfigured": bool(GEMINI_API_KEY),
        "speechProvider": "faster-whisper",
        "speechModel": STT_MODEL_SIZE,
        "speechModelLoaded": _stt_model is not None,
        "speechLanguages": list(STT_SUPPORTED_LANGUAGES.keys()),
    }


@app.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("auto"),
):
    language = language.lower().strip()
    if language not in STT_SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=422,
            detail="The selected language is not supported by the installed faster-whisper model. Use browser voice input or type manually.",
        )
    normalized_content_type = (audio.content_type or "application/octet-stream").split(";", 1)[0].lower().strip()
    allowed_types = {
        "audio/webm", "audio/ogg", "audio/wav", "audio/x-wav", "audio/mpeg",
        "audio/mp4", "audio/x-m4a", "audio/aac", "audio/3gpp",
        "video/webm", "video/mp4", "application/octet-stream",
    }
    if normalized_content_type not in allowed_types:
        raise HTTPException(status_code=415, detail=f"Unsupported audio format ({normalized_content_type}). Please record again.")
    payload = await audio.read(MAX_AUDIO_BYTES + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="The recording is empty.")
    if len(payload) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="The recording is too large.")

    suffix_by_type = {
        "audio/webm": ".webm", "video/webm": ".webm", "audio/ogg": ".ogg",
        "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/mpeg": ".mp3",
        "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "video/mp4": ".m4a",
        "audio/aac": ".aac", "audio/3gpp": ".3gp",
    }
    filename_suffix = os.path.splitext(audio.filename or "")[1].lower()
    safe_filename_suffix = filename_suffix if filename_suffix in {".webm", ".ogg", ".wav", ".mp3", ".m4a", ".mp4", ".aac", ".3gp"} else None
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix_by_type.get(normalized_content_type, safe_filename_suffix or ".audio")) as handle:
            handle.write(payload)
            temporary_path = handle.name

        def run_transcription():
            model = get_stt_model()
            selected_language = STT_SUPPORTED_LANGUAGES[language]
            segments, info = model.transcribe(
                temporary_path,
                language=selected_language,
                task="transcribe",
                beam_size=5,
                vad_filter=True,
                condition_on_previous_text=False,
            )
            text = " ".join(segment.text.strip() for segment in segments if segment.text.strip()).strip()
            return text, info

        transcript, info = await run_in_threadpool(run_transcription)
        if not transcript:
            raise HTTPException(status_code=422, detail="No clear speech was detected. Please record again or type manually.")
        return {
            "text": transcript,
            "language": info.language,
            "languageProbability": round(float(info.language_probability), 4),
            "durationSeconds": round(float(info.duration), 2),
            "provider": "faster-whisper",
            "model": STT_MODEL_SIZE,
        }
    finally:
        if temporary_path and os.path.exists(temporary_path):
            os.unlink(temporary_path)

def offline_rank(text_lower: str):
    results = []
    complaint_tokens = set(text_lower.replace(',', ' ').replace('.', ' ').split())
    for taxonomy in TAXONOMY:
        matched_keywords = [keyword for keyword in taxonomy["keywords"] if keyword.lower() in text_lower]
        weighted_matches = sum(min(5, max(1, len(keyword.split()))) for keyword in matched_keywords)
        description_overlap = len(complaint_tokens.intersection(taxonomy["desc"].lower().split()))
        score = min(0.98, 0.72 + weighted_matches * 0.055) if matched_keywords else min(0.54, description_overlap * 0.12)
        results.append({"code": taxonomy["code"], "dept": taxonomy["dept"], "score": score})
    if max(item["score"] for item in results) == 0:
        results[-1]["score"] = 0.35
    return results


def classify_with_gemini(text: str) -> Optional[GeminiClassification]:
    client = get_gemini_client()
    if client is None:
        return None
    from google.genai import types

    allowed_taxonomy = "\n".join(
        f"- {item['code']}: {item['desc']}" for item in TAXONOMY
    )
    prompt = f"""You are JanSeva AI, an Indian civic grievance routing classifier.
Understand complaints written in any Indian language or mixed script. Select exactly one
department and taxonomy code from the governed list below. Never invent a code.

Priority rules:
- EMERGENCY: immediate danger to life such as live wire, electrocution, gas leak, fire,
  accident, collapse risk, or ambulance emergency.
- HIGH: serious service failure such as burst water main, severe flooding, sewage in
  drinking water, or a large public hazard.
- NORMAL: routine complaints.

Sentiment must be one of DISTRESSED, CONCERNED, FRUSTRATED, CALM. A factual urgent
complaint is at least CONCERNED even when its wording is calm. Confidence is 0 to 1.

Governed taxonomy:
{allowed_taxonomy}

Complaint:
{text}
"""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiClassification,
        ),
    )
    if not response.text:
        return None
    return GeminiClassification.model_validate_json(response.text)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    text_lower = " ".join(req.text.lower().replace("-", " ").replace("/", " ").split())
    results = offline_rank(text_lower)
    gemini_result = None
    provider = "offline-multilingual-router"
    model_version = "multilingual-rules-v3"

    if GEMINI_API_KEY:
        try:
            gemini_result = classify_with_gemini(req.text)
            if gemini_result:
                valid_codes = {item["code"]: item["dept"] for item in TAXONOMY}
                expected_department = valid_codes.get(gemini_result.taxonomyCode)
                if expected_department is None or expected_department != gemini_result.departmentCode:
                    gemini_result = None
                else:
                    provider = "gemini"
                    model_version = GEMINI_MODEL
        except Exception:
            # Classification must remain available during API, quota, or network failures.
            gemini_result = None

    override = next((route for phrases, code, dept in ROUTING_OVERRIDES if any(phrase in text_lower for phrase in phrases) for route in [(code, dept)]), None)
    if override:
        override_code, override_department = override
        for result in results:
            if result["code"] == override_code:
                result["score"] = 0.995
            elif result["dept"] != override_department:
                result["score"] = min(result["score"], 0.84)
    elif gemini_result:
        for result in results:
            if result["code"] == gemini_result.taxonomyCode:
                result["score"] = max(0.01, min(0.99, gemini_result.confidence))
            elif result["dept"] != gemini_result.departmentCode:
                result["score"] = min(result["score"], max(0.01, gemini_result.confidence - 0.08))
    
    results.sort(key=lambda x: x["score"], reverse=True)
    top3 = results[:3]
    
    best = top3[0]
    confidence = best["score"]
    
    # Priority detection with multilingual keywords
    priority = gemini_result.priority if gemini_result and gemini_result.priority in {"NORMAL", "HIGH", "EMERGENCY"} else "NORMAL"
    priorityReason = gemini_result.priorityReason if gemini_result else ""
    urgentReasons = list(gemini_result.urgentReasons) if gemini_result else []
    
    detected_language = gemini_result.detectedLanguage if gemini_result else detect_language(req.text)
    
    # Check for EMERGENCY
    for kw in EMERGENCY_KEYWORDS:
        if kw.lower() in text_lower:
            priority = "EMERGENCY"
            priorityReason = f"Detected safety keyword: '{kw}'."
            urgentReasons.append(f"unsafe condition: {kw}")
            break
    
    # Check for HIGH if not already EMERGENCY
    if priority != "EMERGENCY":
        for kw in HIGH_PRIORITY_KEYWORDS:
            if kw.lower() in text_lower:
                priority = "HIGH"
                priorityReason = f"Detected urgency keyword: '{kw}'."
                break

    if priority == "EMERGENCY":
        sentiment = "DISTRESSED"
    elif priority == "HIGH":
        sentiment = "CONCERNED"
    elif gemini_result and gemini_result.sentiment in {"DISTRESSED", "CONCERNED", "FRUSTRATED", "CALM"}:
        sentiment = gemini_result.sentiment
    elif any(keyword in text_lower for keyword in FRUSTRATION_KEYWORDS):
        sentiment = "FRUSTRATED"
    else:
        sentiment = "CALM"

    severity_score = gemini_result.severityScore if gemini_result else 35
    severity_score = max(severity_score, 90 if priority == "EMERGENCY" else 70 if priority == "HIGH" else 35)
    if sentiment == "FRUSTRATED":
        severity_score = min(100, severity_score + 10)
        
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
    explanation = gemini_result.explanation if gemini_result else f"The complaint matches the '{best['code']}' civic service category."
    if override:
        explanation = f"The complaint contains a specific civic-service phrase and was routed to {best['code']}."

    return AnalyzeResponse(
        grievanceId=req.grievanceId,
        provider=provider,
        modelVersion=model_version,
        taxonomyCode=best["code"],
        departmentCode=best["dept"],
        confidence=round(confidence, 4),
        priority=priority,
        priorityReason=priorityReason,
        detectedLanguage=detected_language,
        sentiment=sentiment,
        severityScore=severity_score,
        urgentReasons=urgentReasons,
        explanation=explanation,
        topPredictions=preds,
        decision=decision,
        requiresHumanReview=requiresHumanReview
    )
