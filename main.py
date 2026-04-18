import os
import cv2
import shutil
import gdown
from fastapi import FastAPI, File, UploadFile
from ultralytics import YOLO
from model_utils import predict_behavior

app = FastAPI()

# ==============================
# تحميل الموديل من Google Drive فقط
# ==============================
FILE_ID = "1TKayUv4XzgFN2kg-QbR8nje6zbArlJZ8"
MODEL_PATH = "best.pt"

url = f"https://drive.google.com/uc?id={FILE_ID}"

gdown.download(url, MODEL_PATH, quiet=False)

model = YOLO(MODEL_PATH)


# ==============================
# helper: check video
# ==============================
def is_video(filename: str):
    return filename.lower().endswith((".mp4", ".avi", ".mov", ".mkv"))


# ==============================
# SMART PREDICTION ENDPOINT
# ==============================
@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    # safe temp file name
    file_path = "temp_input"
    if is_video(file.filename):
        file_path += ".mp4"
    else:
        file_path += ".jpg"

    # حفظ الملف
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ======================
    # IMAGE CASE
    # ======================
    if not is_video(file.filename):

        img = cv2.imread(file_path)

        result = predict_behavior(model, img)

        return {
            "type": "image",
            "result": result
        }

    # ======================
    # VIDEO CASE
    # ======================
    cap = cv2.VideoCapture(file_path)

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0:
        fps = 30  # fallback safe value

    frame_interval = int(fps * 30)

    frame_id = 0
    results = []

    while cap.isOpened():
        ret, frame = cap.read()

        if not ret:
            break

        if frame_id % frame_interval == 0:

            result = predict_behavior(model, frame)

            results.append({
                "time_sec": int(frame_id / fps),
                "result": result
            })

        frame_id += 1

    cap.release()

    return {
        "type": "video",
        "total_predictions": len(results),
        "results": results
    }



