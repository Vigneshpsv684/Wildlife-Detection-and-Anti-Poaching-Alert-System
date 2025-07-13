from ultralytics import YOLO

# Load YOLOv8 model (nano or small recommended for CPU)
model = YOLO("yolov8n.pt")  # or "yolov8s.pt"

# Train on your dataset
model.train(
    data="myyolodata/data.yaml",
    epochs=30,         # Reduce epochs if training is slow on CPU
    imgsz=640,
    batch=4,           # Reduce batch size for CPU
    name="wildlife_model",
    device="cpu"       # ✅ Use CPU explicitly
)
