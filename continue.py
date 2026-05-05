from ultralytics import YOLO

from ultralytics import YOLO

if __name__ == "__main__":

    model = YOLO("runs/detect/final_8_classes_model/weights/last.pt")

    model.train(
        data="data.yaml",
        epochs=50,
        resume=True,
        device=0,
        workers=0  # 🔥 الحل هون
    )