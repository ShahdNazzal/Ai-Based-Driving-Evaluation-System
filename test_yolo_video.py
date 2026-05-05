from ultralytics import YOLO
import cv2

# حمّل مودل YOLO الجاهز
model = YOLO("yolov8n.pt")  # تقدري تغيريه لـ yolov8s.pt لو بدك أدق

# مسار الفيديو
video_path = "test.mp4"  # غيريه لمسار الفيديو تبعك

cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("❌ فشل فتح الفيديو")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        break

    # تشغيل YOLO
    results = model(frame, conf=0.4)

    # رسم النتائج
    annotated_frame = results[0].plot()

    # عرض الفيديو
    cv2.imshow("YOLO Test", annotated_frame)

    # خروج عند الضغط ESC
    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()