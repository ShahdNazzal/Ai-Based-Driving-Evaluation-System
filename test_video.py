from ultralytics import YOLO

model = YOLO("runs/detect/traffic_light_finetune2/weights/best.pt")

results = model.predict(
    source=r"C:\Users\lenovo\Desktop\graduiation project\videos\testing_vid.mp4",
    conf=0.25,
    save=True,
    show=True
)