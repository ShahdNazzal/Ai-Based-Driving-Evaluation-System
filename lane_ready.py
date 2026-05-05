import cv2
import torch
import numpy as np
import sys

# path المشروع
sys.path.append("C:/Users/lenovo/Desktop/graduiation project/Ultra-Fast-Lane-Detection-master")

from model.model import parsingNet

# GPU
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)

# 🔥 المسار الكامل للمودل (مهم جداً)
model_path = "C:/Users/lenovo/Desktop/graduiation project/Ultra-Fast-Lane-Detection-master/tusimple_18.pth"
print("Loading model from:", model_path)

# model
model = parsingNet(pretrained=False, backbone='18', cls_dim=(101, 56, 4))

# تحميل
state_dict = torch.load(model_path, map_location=device)

if "model" in state_dict:
    model.load_state_dict(state_dict["model"])
else:
    model.load_state_dict(state_dict)

model.to(device)
model.eval()

print("✅ MODEL LOADED SUCCESSFULLY")

# فيديو
cap = cv2.VideoCapture("test3.mp4")

col_sample = np.linspace(0, 800 - 1, 101)
col_sample_w = col_sample[1] - col_sample[0]

while True:
    ret, frame = cap.read()
    if not ret:
        break

    original = frame.copy()
    h, w = original.shape[:2]

    # preprocess
    img = cv2.resize(frame, (800, 288))
    img = img[:, :, ::-1]
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))
    img = torch.tensor(img).unsqueeze(0).to(device)

    # inference
    with torch.no_grad():
        out = model(img)

    out = out[0].cpu().numpy()  # (101,56,4)

    # رسم lanes
    for lane_num in range(out.shape[2]):
        lane = out[:, :, lane_num]
        lane = np.argmax(lane, axis=0)

        for i in range(len(lane)):
            if lane[i] != 0:
                x = int(lane[i] * col_sample_w)
                y = int(288 - i * 288 / 56)

                x = int(x * w / 800)
                y = int(y * h / 288)

                cv2.circle(original, (x, y), 3, (0, 255, 0), -1)

    cv2.imshow("Lane Detection", original)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()