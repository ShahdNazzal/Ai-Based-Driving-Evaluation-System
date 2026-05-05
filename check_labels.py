import cv2
import os

image_folder = "dataset/images/train"
label_folder = "dataset/labels/train"

# أسماء الكلاسات (حسب data.yaml)
classes = ["person", "car", "traffic_light"]

# ألوان لكل كلاس
colors = {
    0: (0, 255, 0),     # person → أخضر
    1: (255, 0, 0),     # car → أزرق
    2: (0, 0, 255)      # traffic light → أحمر
}

for img_name in os.listdir(image_folder)[:30]:
    img_path = os.path.join(image_folder, img_name)
    label_path = os.path.join(label_folder, img_name.replace(".jpg", ".txt"))

    img = cv2.imread(img_path)
    h, w, _ = img.shape

    if os.path.exists(label_path):
        with open(label_path, "r") as f:
            for line in f:
                cls, x, y, bw, bh = map(float, line.split())
                cls = int(cls)

                x1 = int((x - bw/2) * w)
                y1 = int((y - bh/2) * h)
                x2 = int((x + bw/2) * w)
                y2 = int((y + bh/2) * h)

                # رسم البوكس
                color = colors.get(cls, (255, 255, 255))
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

                # كتابة اسم الكلاس
                label = classes[cls]
                cv2.putText(img, label, (x1, y1 - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    cv2.imshow("Image", img)
    cv2.waitKey(0)

cv2.destroyAllWindows()