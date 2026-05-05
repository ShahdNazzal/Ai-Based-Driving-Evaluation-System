from ultralytics import YOLO

if __name__ == "__main__":

    model = YOLO("runs/detect/final_8_classes_model/weights/best.pt")

    metrics = model.val(
        data="data.yaml",
        workers=0  # 🔥 أهم سطر
    )

    print(metrics.box.maps)