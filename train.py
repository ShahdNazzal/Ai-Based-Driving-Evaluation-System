from ultralytics import YOLO

if __name__ == "__main__":

    # 🔥 نكمل على المودل القديم
    model = YOLO("runs/detect/traffic_light_finetune2/weights/best.pt")

    model.train(
        data="data.yaml",
        epochs=50,
        imgsz=640,
        batch=16,
        device=0,
        name="final_8_classes_model",

        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10,
        translate=0.1,
        scale=0.5,

        patience=15
    )