// DOM elements
const startMonitoringBtn = document.getElementById('startMonitoring');
const stopMonitoringBtn = document.getElementById('stopMonitoring');
const statusText = document.getElementById('statusText');
const liveView = document.getElementById('liveView');
const detectionList = document.getElementById('detectionList');
const detectionTime = document.getElementById('detectionTime');
const dangerAlert = document.getElementById('dangerAlert');
const dangerItems = document.getElementById('dangerItems');
const alertSound = document.getElementById('alertSound');
const detectForm = document.getElementById('detectForm');
const imageInput = document.getElementById('imageInput');
const imageResults = document.getElementById('imageResults');
const uploadedImage = document.getElementById('uploadedImage');
const imageDetectionList = document.getElementById('imageDetectionList');

// Danger categories
const DANGER_ANIMALS = ['tiger', 'lion', 'elephant', 'bear', 'snake'];
const DANGER_ACTIVITIES = ['tree cutting', 'poaching', 'fire'];

// Stream for live view
let mediaStream = null;

// Start monitoring
startMonitoringBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        // Start camera stream
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        liveView.srcObject = mediaStream;
        
        const response = await fetch('/start_monitoring', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            statusText.textContent = 'ACTIVE';
            statusText.className = 'active';
            startDetectionUpdates();
        }
        alert(data.message);
    } catch (error) {
        console.error('Error starting monitoring:', error);
        alert('Failed to start monitoring: ' + error.message);
    }
});

// Stop monitoring
stopMonitoringBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        const response = await fetch('/stop_monitoring', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            statusText.textContent = 'INACTIVE';
            statusText.className = 'inactive';
            
            // Stop camera stream
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
                liveView.srcObject = null;
                mediaStream = null;
            }
        }
        alert(data.message);
    } catch (error) {
        console.error('Error stopping monitoring:', error);
        alert('Failed to stop monitoring: ' + error.message);
    }
});

// Image detection form
detectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!imageInput.files || imageInput.files.length === 0) {
        alert('Please select an image file');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);

        const response = await fetch('/detect', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();

        if (data.status === 'success') {
            imageResults.classList.remove('hidden');
            
            // Display uploaded image
            uploadedImage.src = `data:image/jpeg;base64,${data.image}`;

            // Display detection results
            imageDetectionList.innerHTML = '';
            data.detections.forEach(detection => {
                const item = document.createElement('div');
                item.className = 'detection-item';
                item.innerHTML = `
                    <strong>${detection.label}</strong>
                    <span>Confidence: ${(detection.confidence * 100).toFixed(1)}%</span>
                `;
                imageDetectionList.appendChild(item);
            });

            // Show danger alert if needed
            if (data.danger_alert) {
                showDangerAlert(data.detections.filter(det => 
                    DANGER_ANIMALS.includes(det.label.toLowerCase()) || 
                    DANGER_ACTIVITIES.includes(det.label.toLowerCase())
                );
            }
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Error detecting image:', error);
        alert('Failed to process image: ' + error.message);
    }
});

// Show danger alert
function showDangerAlert(dangerItems) {
    dangerItemsEl.innerHTML = `
        Detected: ${dangerItems.map(item => item.label).join(', ')}<br>
        Alert sent to forest department!
    `;
    
    dangerAlert.classList.remove('hidden');
    alertSound.play();
    
    // Hide after 10 seconds
    setTimeout(() => {
        dangerAlert.classList.add('hidden');
    }, 10000);
}

// Poll for detection updates
function startDetectionUpdates() {
    const updateInterval = setInterval(async () => {
        if (statusText.textContent === 'INACTIVE') {
            clearInterval(updateInterval);
            return;
        }

        try {
            const response = await fetch('/get_detections');
            const data = await response.json();
            
            if (data.last_detection) {
                detectionTime.textContent = `Time: ${new Date(data.last_detection.timestamp).toLocaleString()}`;
                detectionList.innerHTML = '';
                
                data.last_detection.detections.forEach(detection => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        ${detection.label} (${(detection.confidence * 100).toFixed(1)}%)
                    `;
                    detectionList.appendChild(li);
                });

                // Check for danger items
                const dangerItems = data.last_detection.detections.filter(det => 
                    DANGER_ANIMALS.includes(det.label.toLowerCase()) || 
                    DANGER_ACTIVITIES.includes(det.label.toLowerCase())
                );
                
                if (dangerItems.length > 0) {
                    showDangerAlert(dangerItems);
                }
            }
        } catch (error) {
            console.error('Error updating detections:', error);
        }
    }, 1000);
}