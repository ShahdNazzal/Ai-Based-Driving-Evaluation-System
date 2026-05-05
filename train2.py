from ultralytics import YOLO

if __name__ == "__main__":

    model = YOLO("runs/detect/final_8_classes_model/weights/best.pt")

    model.train(
        data="data.yaml",
        epochs=15,   # 🔥 زي ما قررنا
        imgsz=640,
        batch=16,
        device=0,
        workers=0,
        patience=5
    )