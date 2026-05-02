import os
import cv2
import gdown
import gradio as gr
import numpy as np
import tensorflow as tf
import zipfile
import shutil

from PIL import Image
from tensorflow import keras
from ultralytics import YOLO


# =====================================
# Behavior model
# =====================================
BEHAVIOR_FILE_ID = "1TxjAtfd04i-Z10qz9vXb1303405eYlw9"

BEHAVIOR_DIR = "behavior_model_assets"
BEHAVIOR_DOWNLOAD_PATH = os.path.join(BEHAVIOR_DIR, "behavior_model_file")
BEHAVIOR_MODEL_PATH = os.path.join(BEHAVIOR_DIR, "best.pt")

behavior_model = None


# Classes from the new behavior model training code
BEHAVIOR_CLASSES = {
    0: "unknown",
    1: "safe driving",
    2: "texting",
    3: "talking on the phone",
    4: "operating the radio",
    5: "drinking",
    6: "reaching behind",
    7: "hair and makeup",
    8: "talking to passenger",
    9: "eyes closed",
    10: "yawning",
    11: "nodding off",
    12: "eyes open",
}


# Behavior status groups
SAFE_CLASSES = [1, 12]
WARNING_CLASSES = [0, 4, 8, 9, 10]
BAD_CLASSES = [2, 3, 5, 6, 7, 11]


def download_behavior_model():
    os.makedirs(BEHAVIOR_DIR, exist_ok=True)

    if os.path.exists(BEHAVIOR_MODEL_PATH):
        return BEHAVIOR_MODEL_PATH

    url = f"https://drive.google.com/uc?id={BEHAVIOR_FILE_ID}"

    if not os.path.exists(BEHAVIOR_DOWNLOAD_PATH):
        gdown.download(url, BEHAVIOR_DOWNLOAD_PATH, quiet=False)

    # Case 1: downloaded file is a zip file
    if zipfile.is_zipfile(BEHAVIOR_DOWNLOAD_PATH):
        extract_dir = os.path.join(BEHAVIOR_DIR, "extracted")
        os.makedirs(extract_dir, exist_ok=True)

        with zipfile.ZipFile(BEHAVIOR_DOWNLOAD_PATH, "r") as zip_ref:
            zip_ref.extractall(extract_dir)

        found_pt = None

        for root, dirs, files in os.walk(extract_dir):
            for file in files:
                if file.endswith(".pt"):
                    found_pt = os.path.join(root, file)
                    break

            if found_pt is not None:
                break

        if found_pt is None:
            raise FileNotFoundError("No .pt file found inside the downloaded behavior zip file")

        shutil.copy(found_pt, BEHAVIOR_MODEL_PATH)
        return BEHAVIOR_MODEL_PATH

    # Case 2: downloaded file is already a .pt file
    shutil.copy(BEHAVIOR_DOWNLOAD_PATH, BEHAVIOR_MODEL_PATH)
    return BEHAVIOR_MODEL_PATH


def get_behavior_model():
    global behavior_model

    if behavior_model is None:
        model_path = download_behavior_model()
        behavior_model = YOLO(model_path)

    return behavior_model


def predict_behavior(model, img):
    """
    Predict driver behavior using YOLO model.
    img should be a BGR image from OpenCV.
    """

    results = model(img)
    result = results[0]

    if result.boxes is None or len(result.boxes) == 0:
        return {
            "class_id": None,
            "behavior": "safe driving",
            "confidence": 1.0,
            "status": "safe"
        }

    confs = result.boxes.conf.cpu().detach().numpy()
    clss = result.boxes.cls.cpu().detach().numpy()

    best_idx = confs.argmax()

    cls_id = int(clss[best_idx])
    conf = float(confs[best_idx])

    behavior = BEHAVIOR_CLASSES.get(cls_id, f"unknown_{cls_id}")

    if cls_id in SAFE_CLASSES:
        status = "safe"
    elif cls_id in WARNING_CLASSES:
        status = "warning"
    elif cls_id in BAD_CLASSES:
        status = "bad"
    else:
        status = "warning"

    return {
        "class_id": cls_id,
        "behavior": behavior,
        "confidence": round(conf, 6),
        "status": status
    }


# =====================================
# Seatbelt model
# =====================================
SEATBELT_FILE_ID = "1yGWDyu5IrmAcr4xnWAJ22novIZLYBnV-"

MODEL_DIR = "model_assets"
SEATBELT_MODEL_PATH = os.path.join(MODEL_DIR, "seatbelt_classifier_final.keras")
THRESHOLD_PATH = os.path.join(MODEL_DIR, "best_threshold.npy")
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.txt")

seatbelt_model = None
best_threshold = None
class_names = None

IMG_SIZE = (300, 300)


def get_seatbelt_model():
    global seatbelt_model, best_threshold, class_names

    if seatbelt_model is None:
        os.makedirs(MODEL_DIR, exist_ok=True)

        if not os.path.exists(THRESHOLD_PATH):
            raise FileNotFoundError(f"Threshold file not found: {THRESHOLD_PATH}")

        if not os.path.exists(CLASS_NAMES_PATH):
            raise FileNotFoundError(f"Class names file not found: {CLASS_NAMES_PATH}")

        if not os.path.exists(SEATBELT_MODEL_PATH):
            url = f"https://drive.google.com/uc?id={SEATBELT_FILE_ID}"
            gdown.download(url, SEATBELT_MODEL_PATH, quiet=False)

        seatbelt_model = keras.models.load_model(SEATBELT_MODEL_PATH, compile=False)
        best_threshold = float(np.load(THRESHOLD_PATH))

        with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
            class_names = [line.strip() for line in f.readlines() if line.strip()]

    return seatbelt_model, best_threshold, class_names


# =====================================
# Seatbelt helpers
# =====================================
def pil_to_array(image: Image.Image):
    image = image.convert("RGB")
    image = image.resize(IMG_SIZE)
    arr = np.array(image, dtype=np.float32)
    return arr


def predict_seatbelt_tta(model_instance, threshold, class_names_list, image: Image.Image):
    img_array = pil_to_array(image)

    versions = [
        img_array,
        np.fliplr(img_array),
        tf.image.adjust_contrast(img_array, 1.05).numpy(),
        tf.image.adjust_brightness(img_array, 0.03).numpy(),
    ]

    probs = []

    for arr in versions:
        arr = np.expand_dims(arr.astype(np.float32), axis=0)
        prob = model_instance.predict(arr, verbose=0)[0][0]
        probs.append(float(prob))

    prob = float(np.mean(probs))

    pred_idx = 1 if prob >= threshold else 0

    if pred_idx >= len(class_names_list):
        pred_class = f"class_{pred_idx}"
    else:
        pred_class = class_names_list[pred_idx]

    confidence = prob if pred_idx == 1 else 1.0 - prob

    return {
        "predicted_class": str(pred_class),
        "seatbelt_on": bool(pred_idx == 1),
        "confidence": round(float(confidence), 6),
        "raw_probability": round(float(prob), 6)
    }


# =====================================
# Combined image prediction
# =====================================
def predict_combined_image(image):
    try:
        if image is None:
            return {"error": "No image provided"}

        behavior_model_instance = get_behavior_model()
        seatbelt_model_instance, threshold, class_names_list = get_seatbelt_model()

        behavior_img = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        behavior_result = predict_behavior(behavior_model_instance, behavior_img)

        pil_img = Image.fromarray(image.astype("uint8"))
        seatbelt_result = predict_seatbelt_tta(
            seatbelt_model_instance,
            threshold,
            class_names_list,
            pil_img
        )

        return {
            "behavior": {
                "class_id": None if behavior_result["class_id"] is None else int(behavior_result["class_id"]),
                "behavior": str(behavior_result["behavior"]),
                "confidence": None if behavior_result["confidence"] is None else float(behavior_result["confidence"]),
                "status": str(behavior_result["status"])
            },
            "seatbelt": {
                "predicted_class": str(seatbelt_result["predicted_class"]),
                "seatbelt_on": bool(seatbelt_result["seatbelt_on"]),
                "confidence": float(seatbelt_result["confidence"]),
                "raw_probability": float(seatbelt_result["raw_probability"])
            }
        }

    except Exception as e:
        return {"error": str(e)}


# =====================================
# Combined video prediction
# =====================================
def predict_combined_video(video_file):
    try:
        if video_file is None:
            return {"error": "No video provided"}

        behavior_model_instance = get_behavior_model()
        seatbelt_model_instance, threshold, class_names_list = get_seatbelt_model()

        video_path = str(video_file)
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            return {"error": "Cannot open video"}

        fps = cap.get(cv2.CAP_PROP_FPS)

        if fps == 0 or fps is None:
            fps = 30

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration_sec = int(total_frames / fps) if total_frames > 0 else 0

        # =====================================
        # Video analysis intervals
        # =====================================
        # Behavior: analyze every 1 minute
        # Seatbelt: analyze every 3 minutes
        BEHAVIOR_CHECK_SECONDS = 60
        SEATBELT_CHECK_SECONDS = 180

        behavior_frame_interval = max(1, int(fps * BEHAVIOR_CHECK_SECONDS))
        seatbelt_frame_interval = max(1, int(fps * SEATBELT_CHECK_SECONDS))

        frame_id = 0
        results = []

        safe_count = 0
        warning_count = 0
        bad_count = 0

        seatbelt_on_count = 0
        no_seatbelt_count = 0

        behavior_checks = 0
        seatbelt_checks = 0

        while True:
            ret, frame = cap.read()

            if not ret:
                break

            current_time = int(frame_id / fps)
            entry = {"time_sec": current_time}

            # Analyze behavior every 60 seconds
            if frame_id % behavior_frame_interval == 0:
                behavior_result = predict_behavior(behavior_model_instance, frame)
                behavior_checks += 1

                status = behavior_result.get("status", "safe")

                if status == "safe":
                    safe_count += 1
                elif status == "warning":
                    warning_count += 1
                else:
                    bad_count += 1

                entry["behavior"] = {
                    "class_id": None if behavior_result["class_id"] is None else int(behavior_result["class_id"]),
                    "behavior": str(behavior_result["behavior"]),
                    "status": str(behavior_result["status"]),
                    "confidence": None if behavior_result["confidence"] is None else float(behavior_result["confidence"])
                }

            # Analyze seatbelt every 180 seconds
            if frame_id % seatbelt_frame_interval == 0:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb)

                seatbelt_result = predict_seatbelt_tta(
                    seatbelt_model_instance,
                    threshold,
                    class_names_list,
                    pil_img
                )

                seatbelt_checks += 1

                if seatbelt_result["seatbelt_on"]:
                    seatbelt_on_count += 1
                else:
                    no_seatbelt_count += 1

                entry["seatbelt"] = {
                    "predicted_class": str(seatbelt_result["predicted_class"]),
                    "seatbelt_on": bool(seatbelt_result["seatbelt_on"]),
                    "confidence": float(seatbelt_result["confidence"]),
                    "raw_probability": float(seatbelt_result["raw_probability"])
                }

            if "behavior" in entry or "seatbelt" in entry:
                results.append(entry)

            frame_id += 1

        cap.release()

        total_behavior = safe_count + warning_count + bad_count

        if total_behavior > 0:
            behavior_score = (safe_count / total_behavior) * 2
        else:
            behavior_score = 2

        if seatbelt_on_count >= no_seatbelt_count:
            seatbelt_decision = "Seatbelt Worn"
            seatbelt_score = 2
        else:
            seatbelt_decision = "No Seatbelt"
            seatbelt_score = 0

        return {
            "type": "video",
            "video_duration_sec": video_duration_sec,
            "behavior_analysis_every_sec": BEHAVIOR_CHECK_SECONDS,
            "seatbelt_analysis_every_sec": SEATBELT_CHECK_SECONDS,
            "total_checks": len(results),
            "behavior_total_checks": behavior_checks,
            "seatbelt_total_checks": seatbelt_checks,
            "results": results,
            "behavior_score": {
                "safe_count": safe_count,
                "warning_count": warning_count,
                "bad_count": bad_count,
                "score_out_of_2": round(float(behavior_score), 2)
            },
            "seatbelt_score": {
                "seatbelt_on_count": seatbelt_on_count,
                "no_seatbelt_count": no_seatbelt_count,
                "final_decision": seatbelt_decision,
                "score_out_of_2": seatbelt_score
            }
        }

    except Exception as e:
        return {"error": str(e)}


# =====================================
# UI
# =====================================
with gr.Blocks() as demo:
    gr.Markdown("# 🚗 Driver Monitoring System")
    gr.Markdown(
        "Upload one image or one video to get both behavior and seatbelt results."
    )
    gr.Markdown(
        "For videos: behavior is analyzed every 1 minute, and seatbelt is analyzed every 3 minutes."
    )

    with gr.Tab("📷 Image"):
        image_input = gr.Image(type="numpy", label="Upload Image")
        image_output = gr.JSON(label="Combined Result")
        image_btn = gr.Button("Analyze Image")

        image_btn.click(
            fn=predict_combined_image,
            inputs=image_input,
            outputs=image_output
        )

    with gr.Tab("🎥 Video"):
        video_input = gr.Video(
            sources=["upload", "webcam"],
            height=300,
            label="Upload Video"
        )

        video_output_json = gr.JSON(label="Combined Video Result")
        video_btn = gr.Button("Analyze Video")

        video_btn.click(
            fn=predict_combined_video,
            inputs=video_input,
            outputs=video_output_json
        )


demo.launch()
