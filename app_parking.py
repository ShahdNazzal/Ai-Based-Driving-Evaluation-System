import cv2
import tempfile
import numpy as np
import gradio as gr
from ultralytics import YOLO

# ==============================
# MODELS
# ==============================
car_model = YOLO("yolov8n.pt")
cone_model = YOLO("best.pt")

CAR_CLASS_ID = 2
CAR_CONF = 0.4
CONE_CONF = 0.4

# 🔥 تسريع المعالجة
FRAME_SKIP = 3   # تحليل كل 3 فريمات


# ==============================
# HELPERS
# ==============================
def get_center(box):
    x1, y1, x2, y2 = box
    return ((x1 + x2) // 2, (y1 + y2) // 2)


def inside_parking(car_center, cones):
    xs = [c[0] for c in cones]
    ys = [c[1] for c in cones]
    return (min(xs) < car_center[0] < max(xs)) and (min(ys) < car_center[1] < max(ys))


def draw_box(frame, box, label, color):
    x1, y1, x2, y2 = map(int, box)
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
    cv2.putText(frame, label, (x1, y1 - 6),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)


# ==============================
# VIDEO WRITER (FIXED)
# ==============================
def create_writer(path, fps, size):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, fps, size)

    if not writer.isOpened():
        raise RuntimeError("VideoWriter failed")

    return writer


# ==============================
# MAIN PIPELINE (OPTIMIZED)
# ==============================
def analyze_video(video_input):

    if isinstance(video_input, dict):
        video_path = video_input["name"]
    else:
        video_path = video_input

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        return None, {"error": "Cannot open video"}

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps is None or fps < 1:
        fps = 25

    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    out_path = tmp.name
    tmp.close()

    out = create_writer(out_path, fps, (W, H))

    # ================= METRICS =================
    still_counter = 0
    last_center = None

    alignment_hits = 0
    total_checks = 0

    frame_id = 0

    # ================= PROCESS =================
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_id += 1

        # 🔥 تخطي فريمات (تسريع كبير)
        if frame_id % FRAME_SKIP != 0:
            out.write(frame)
            continue

        # 🔥 تصغير الصورة (تسريع إضافي)
        frame = cv2.resize(frame, (640, 360))

        # -------- CAR DETECTION --------
        car_results = car_model(frame, conf=CAR_CONF, imgsz=640, verbose=False)

        car_box = None
        cars = []

        for r in car_results:
            for box in r.boxes:
                if int(box.cls[0]) == CAR_CLASS_ID:
                    cars.append(tuple(map(int, box.xyxy[0])))

        if cars:
            car_box = cars[0]
            center = get_center(car_box)

            if last_center is not None:
                dist = np.linalg.norm(np.array(center) - np.array(last_center))
                if dist < 5:
                    still_counter += 1

            last_center = center
            draw_box(frame, car_box, "CAR", (255, 0, 0))

        # -------- CONES --------
        cone_results = cone_model(frame, conf=CONE_CONF, imgsz=640, verbose=False)

        cones = []
        for r in cone_results:
            for box in r.boxes:
                b = tuple(map(int, box.xyxy[0]))
                cx = (b[0] + b[2]) // 2
                cy = (b[1] + b[3]) // 2
                cones.append((cx, cy))

                draw_box(frame, b, "CONE", (0, 255, 255))

        # -------- ALIGNMENT --------
        if car_box and len(cones) >= 4:
            total_checks += 1
            if inside_parking(get_center(car_box), cones):
                alignment_hits += 1

        # -------- HUD --------
        cv2.putText(frame, f"Frame: {frame_id}",
                    (20, 40), cv2.FONT_HERSHEY_SIMPLEX,
                    1, (255, 255, 255), 2)

        out.write(frame)

    # ================= CLEANUP =================
    cap.release()
    out.release()
    cv2.destroyAllWindows()

    # ================= SCORING =================
    if total_checks == 0:
        alignment_score = 0
    else:
        ratio = alignment_hits / total_checks
        if ratio > 0.7:
            alignment_score = 3
        elif ratio > 0.4:
            alignment_score = 2
        elif ratio > 0.2:
            alignment_score = 1.5
        else:
            alignment_score = 0

    if still_counter > 15:
        stability_score = 2
    elif still_counter > 7:
        stability_score = 1
    else:
        stability_score = 0

    total = alignment_score + stability_score

    report = {
        "alignment": f"{alignment_score}/3",
        "stability": f"{stability_score}/2",
        "total": f"{total}/5"
    }

    return out_path, report


# ==============================
# GRADIO UI
# ==============================
with gr.Blocks() as demo:

    gr.Markdown("# 🚗 Parking AI System (FAST VERSION ⚡)")

    with gr.Tab("Upload Video"):
        inp = gr.Video()
        out_vid = gr.Video()
        out_json = gr.JSON()

        btn = gr.Button("Analyze")

        btn.click(
            fn=analyze_video,
            inputs=inp,
            outputs=[out_vid, out_json]
        )

    with gr.Tab("Record Video"):
        inp2 = gr.Video()
        out_vid2 = gr.Video()
        out_json2 = gr.JSON()

        btn2 = gr.Button("Analyze")

        btn2.click(
            fn=analyze_video,
            inputs=inp2,
            outputs=[out_vid2, out_json2]
        )


# ==============================
# RUN
# ==============================
demo.launch()
