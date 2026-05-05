from ultralytics import YOLO
import cv2
import os

model = YOLO("yolov8n.pt")

image_folder = "dataset/images/train"
label_folder = "dataset/labels/train"

os.makedirs(label_folder, exist_ok=True)

COCO_MAP = {
    0: 0,
    2: 1,
    9: 2,
}

for img_name in os.listdir(image_folder):

    if "frame_clean_" not in img_name:
        continue

    img_path = os.path.join(image_folder, img_name)
    img = cv2.imread(img_path)

    if img is None:
        continue

    h, w, _ = img.shape
    results = model(img_path)[0]

    label_path = os.path.join(label_folder, img_name.replace(".jpg", ".txt"))

    with open(label_path, "w") as f:
        for box in results.boxes:
            coco_cls = int(box.cls[0])

            if coco_cls not in COCO_MAP:
                continue

            our_cls = COCO_MAP[coco_cls]

            x1, y1, x2, y2 = box.xyxy[0]

            x_center = ((x1 + x2) / 2) / w
            y_center = ((y1 + y2) / 2) / h
            width = (x2 - x1) / w
            height = (y2 - y1) / h

            f.write(f"{our_cls} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n")

print("DONE LABELING")