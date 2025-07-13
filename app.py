from flask import Flask, request, jsonify, render_template
from ultralytics import YOLO
import cv2
import os
import uuid
from datetime import datetime
import threading

app = Flask(__name__, static_folder='static')

# Load trained model
model = YOLO('runs/detect/wildlife_model/weights/best.pt')

# Detection variables
last_detection = None
detection_lock = threading.Lock()

def run_detection():
    global last_detection
    
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return
    
    while True:
        ret, frame = cap.read()
        if not ret:
            continue
            
        # Run detection
        filename = f"temp_{uuid.uuid4().hex}.jpg"
        cv2.imwrite(filename, frame)
        
        results = model(filename)
        detections = []
        
        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls)
                conf = float(box.conf)
                label = model.names[cls_id]
                detections.append({
                    'label': label,
                    'confidence': round(conf, 2)
                })
        
        # Update last detection
        with detection_lock:
            last_detection = {
                'timestamp': datetime.now().isoformat(),
                'detections': detections
            }
        
        # Cleanup
        try:
            os.remove(filename)
        except:
            pass
        
        # Adjust detection frequency
        cv2.waitKey(2000)
    
    cap.release()

# Start detection thread
detection_thread = threading.Thread(target=run_detection)
detection_thread.daemon = True
detection_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_detections')
def get_detections():
    with detection_lock:
        return jsonify({
            'last_detection': last_detection or {
                'timestamp': datetime.now().isoformat(),
                'detections': []
            }
        })

@app.route('/chat', methods=['POST'])
def chat():
    message = request.form.get('message')
    if not message:
        return jsonify({'status': 'error', 'message': 'No message provided'}), 400
    
    # Simple mock response - replace with your actual chatbot logic
    response = f"I received your question about: {message}. This is a mock response."
    
    return jsonify({
        'status': 'success',
        'response': response
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')