import os
import zipfile
import yaml
from pathlib import Path

import matplotlib.pyplot as plt
from ultralytics import YOLO


# ==============================
# Settings
# ==============================

ZIP_PATH = Path("driving.v1i.yolov8.zip")
DATASET_ROOT = Path("driver_dataset")
RUNS_DIR = Path("runs_driver")
MODEL_NAME = "driver_behavior_model"

EPOCHS = 25
IMG_SIZE = 640
BATCH_SIZE = 8

# لو عندك GPU خليها 0
# لو جهازك ما فيه GPU خليها "cpu"
DEVICE = "cpu"


# ==============================
# 1) Extract Dataset
# ==============================

if not ZIP_PATH.exists():
    raise FileNotFoundError(f"Dataset ZIP not found: {ZIP_PATH}")

if not DATASET_ROOT.exists():
    DATASET_ROOT.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(ZIP_PATH, "r") as z:
        z.extractall(DATASET_ROOT)

    print("✅ Dataset extracted")
else:
    print("✅ Dataset folder already exists")


# ==============================
# 2) Create fixed data.yaml
# ==============================

class_names = [
    "unknown",
    "c0 - Safe Driving",
    "c1 - Texting",
    "c2 - Talking on the phone",
    "c3 - Operating the Radio",
    "c4 - Drinking",
    "c5 - Reaching Behind",
    "c6 - Hair and Makeup",
    "c7 - Talking to Passenger",
    "d0 - Eyes Closed",
    "d1 - Yawning",
    "d2 - Nodding Off",
    "d3 - Eyes Open",
]

DATA_YAML = DATASET_ROOT / "data_fixed.yaml"

fixed_yaml = {
    "path": str(DATASET_ROOT.resolve()),
    "train": "train/images",
    "val": "valid/images",
    "test": "test/images",
    "nc": len(class_names),
    "names": class_names,
}

with open(DATA_YAML, "w", encoding="utf-8") as f:
    yaml.dump(fixed_yaml, f, allow_unicode=True, sort_keys=False)

print("✅ data_fixed.yaml created:", DATA_YAML)


# ==============================
# 3) Check Dataset Structure
# ==============================

required_folders = [
    "train/images",
    "train/labels",
    "valid/images",
    "valid/labels",
    "test/images",
    "test/labels",
]

for folder in required_folders:
    p = DATASET_ROOT / folder
    if not p.exists():
        raise FileNotFoundError(f"Missing folder: {p}")

    print(folder, "=>", len(os.listdir(p)), "files")


# ==============================
# 4) Train YOLOv8
# ==============================

model = YOLO("yolov8m.pt")

results = model.train(
    data=str(DATA_YAML),
    epochs=EPOCHS,
    imgsz=IMG_SIZE,
    batch=BATCH_SIZE,
    device=DEVICE,
    patience=15,
    workers=2,
    project=str(RUNS_DIR),
    name=MODEL_NAME,
)

print("✅ Training completed")


# ==============================
# 5) Load Best Model
# ==============================

MODEL_PATH = RUNS_DIR / MODEL_NAME / "weights" / "best.pt"

if not MODEL_PATH.exists():
    raise FileNotFoundError(f"best.pt not found: {MODEL_PATH}")

model = YOLO(str(MODEL_PATH))

print("✅ Best model loaded:", MODEL_PATH)


# ==============================
# 6) Class Maps
# ==============================

class_map = {
    0: "unknown",
    1: "c0 - Safe Driving",
    2: "c1 - Texting",
    3: "c2 - Talking on the phone",
    4: "c3 - Operating the Radio",
    5: "c4 - Drinking",
    6: "c5 - Reaching Behind",
    7: "c6 - Hair and Makeup",
    8: "c7 - Talking to Passenger",
    9: "d0 - Eyes Closed",
    10: "d1 - Yawning",
    11: "d2 - Nodding Off",
    12: "d3 - Eyes Open",
}

label_to_ar = {
    "unknown": "غير معروف",
    "c0 - Safe Driving": "قيادة آمنة",
    "c1 - Texting": "استخدام الهاتف / كتابة رسالة",
    "c2 - Talking on the phone": "التحدث على الهاتف",
    "c3 - Operating the Radio": "التعامل مع الراديو",
    "c4 - Drinking": "الشرب أثناء القيادة",
    "c5 - Reaching Behind": "الوصول للخلف",
    "c6 - Hair and Makeup": "الانشغال بالمظهر أو المكياج",
    "c7 - Talking to Passenger": "التحدث مع الراكب",
    "d0 - Eyes Closed": "إغلاق العينين",
    "d1 - Yawning": "التثاؤب",
    "d2 - Nodding Off": "النعاس أو الغفوة",
    "d3 - Eyes Open": "العينان مفتوحتان",
}

unsafe_labels = [
    "c1 - Texting",
    "c2 - Talking on the phone",
    "c3 - Operating the Radio",
    "c4 - Drinking",
    "c5 - Reaching Behind",
    "c6 - Hair and Makeup",
    "c7 - Talking to Passenger",
    "d0 - Eyes Closed",
    "d1 - Yawning",
    "d2 - Nodding Off",
]


# ==============================
# 7) Analyze Image
# ==============================

def analyze_image_precise(image_path, conf=0.5, show=True):
    result = model.predict(source=image_path, conf=conf, verbose=False)[0]

    detections = []

    for box in result.boxes:
        cls_id = int(box.cls[0].item())
        score = float(box.conf[0].item())
        label = class_map.get(cls_id, f"unknown_{cls_id}")

        detections.append({
            "class_id": cls_id,
            "label": label,
            "confidence": round(score, 4),
        })

    detections = sorted(
        detections,
        key=lambda x: x["confidence"],
        reverse=True
    )

    if show:
        plotted = result.plot()
        plt.figure(figsize=(8, 8))
        plt.imshow(plotted[:, :, ::-1])
        plt.axis("off")
        plt.show()

    return detections


# ==============================
# 8) Build Arabic Report
# ==============================

def build_driver_report_precise(detections):
    if not detections:
        return {
            "primary_action": "لم يتم اكتشاف سلوك واضح",
            "secondary_actions": [],
            "safety_status": "غير واضح",
            "description_ar": "لم يتمكن النموذج من تحديد سلوك واضح للسائق.",
            "violations": ["لا توجد مخالفة مؤكدة"],
        }

    primary = detections[0]
    primary_label = primary["label"]
    primary_conf = primary["confidence"]

    secondary = [
        d for d in detections[1:]
        if d["confidence"] >= 0.65
    ]

    if primary_label in ["c0 - Safe Driving", "d3 - Eyes Open"]:
        safety_status = "ملتزم غالبًا"
        description_ar = "يبدو أن السائق يقود بشكل طبيعي وآمن."
        violations = ["لا توجد مخالفة مؤكدة"]

    elif primary_label in unsafe_labels:
        safety_status = "غير ملتزم"
        description_ar = f"تم اكتشاف سلوك غير آمن: {label_to_ar.get(primary_label, primary_label)}."
        violations = [label_to_ar.get(primary_label, primary_label)]

    else:
        safety_status = "غير واضح"
        description_ar = "تم اكتشاف سلوك غير واضح."
        violations = ["غير واضح"]

    secondary_actions = [
        f"{label_to_ar.get(d['label'], d['label'])} ({d['confidence']:.2f})"
        for d in secondary
    ]

    return {
        "primary_action": f"{label_to_ar.get(primary_label, primary_label)} ({primary_conf:.2f})",
        "secondary_actions": secondary_actions,
        "safety_status": safety_status,
        "description_ar": description_ar,
        "violations": violations,
    }


# ==============================
# 9) Print Report
# ==============================

def print_precise_report(report):
    print("=" * 60)
    print("تقرير تحليل سلوك السائق")
    print("=" * 60)
    print("الوصف الرئيسي:", report["primary_action"])
    print("الحالة العامة:", report["safety_status"])
    print("الوصف العربي:", report["description_ar"])

    print("\nالأفعال الثانوية:")
    if report["secondary_actions"]:
        for s in report["secondary_actions"]:
            print("-", s)
    else:
        print("- لا يوجد")

    print("\nالمخالفات:")
    for v in report["violations"]:
        print("-", v)


# ==============================
# 10) Validate Model
# ==============================

metrics = model.val()
print("✅ Validation completed")
print(metrics)


# ==============================
# 11) Test Image
# ==============================

test_image_path = input("\nEnter test image path: ").strip()

if test_image_path:
    if not os.path.exists(test_image_path):
        print("❌ Image not found:", test_image_path)
    else:
        detections = analyze_image_precise(
            test_image_path,
            conf=0.5,
            show=True
        )

        report = build_driver_report_precise(detections)
        print_precise_report(report)