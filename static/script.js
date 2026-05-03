document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const resultArea = document.getElementById('result-area');
    const previewImage = document.getElementById('preview-image');
    const canvas = document.getElementById('canvas');
    const resetBtn = document.getElementById('reset-btn');
    const loading = document.getElementById('loading');
    const statusMessage = document.getElementById('status-message');

    // Handle browse button click
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropArea.classList.add('highlight');
    }

    function unhighlight(e) {
        dropArea.classList.remove('highlight');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    // Handle file input change
    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                processImage(file);
            } else {
                alert('Please upload an image file.');
            }
        }
    }

    function processImage(file) {
        // Show result area, hide drop area
        dropArea.classList.add('hidden');
        resultArea.classList.remove('hidden');
        
        // Show loading state
        loading.classList.remove('hidden');
        statusMessage.textContent = '';
        
        // Clear previous canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Preview the image
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.onload = () => {
                // Match canvas size to image display size
                matchCanvasToImage();
                // Send to API
                detectLicensePlate(file);
            };
            previewImage.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }

    // Adjust canvas size to match the image size in DOM
    function matchCanvasToImage() {
        canvas.width = previewImage.naturalWidth;
        canvas.height = previewImage.naturalHeight;
    }
    
    // Ensure canvas stays aligned if window resizes
    window.addEventListener('resize', () => {
        if (!resultArea.classList.contains('hidden')) {
            // Re-draw? No need since canvas is absolutely positioned and scales with CSS, 
            // but its internal coordinate system is the natural image size.
        }
    });

    async function detectLicensePlate(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Note: In production this would be the actual API URL
            const response = await fetch('/detect', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Hide loading
            loading.classList.add('hidden');
            
            if (data.detections && data.detections.length > 0) {
                statusMessage.textContent = `Found ${data.detections.length} license plate(s)!`;
                statusMessage.style.color = '#10b981'; // Green
                drawDetections(data.detections);
            } else {
                statusMessage.textContent = 'No license plates detected.';
                statusMessage.style.color = '#f59e0b'; // Amber
            }

        } catch (error) {
            console.error('Error:', error);
            loading.classList.add('hidden');
            statusMessage.textContent = 'Failed to detect license plate. Server error.';
            statusMessage.style.color = '#ef4444'; // Red
        }
    }

    function drawDetections(detections) {
        const ctx = canvas.getContext('2d');
        
        detections.forEach(det => {
            const [x1, y1, x2, y2] = det.box;
            const width = x2 - x1;
            const height = y2 - y1;
            
            // Draw glowing box
            ctx.strokeStyle = '#10b981'; // Accent color
            ctx.lineWidth = Math.max(3, canvas.width / 200);
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 10;
            ctx.strokeRect(x1, y1, width, height);
            
            // Reset shadow for text
            ctx.shadowBlur = 0;
            
            // Draw label background
            const label = `${det.label} ${(det.score * 100).toFixed(1)}%`;
            ctx.font = `bold ${Math.max(14, canvas.width / 40)}px Inter, sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const textHeight = parseInt(ctx.font, 10) * 1.2;
            
            ctx.fillStyle = '#10b981';
            ctx.fillRect(x1, y1 - textHeight, textWidth + 10, textHeight);
            
            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, x1 + 5, y1 - 5);
        });
    }

    // Reset UI
    resetBtn.addEventListener('click', () => {
        resultArea.classList.add('hidden');
        dropArea.classList.remove('hidden');
        fileInput.value = '';
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        statusMessage.textContent = '';
    });
});
