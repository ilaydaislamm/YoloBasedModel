import io
import json
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import torch

# Patch torch.load to bypass PyTorch 2.6+ weights_only=True default
_original_load = torch.load
def _safe_load(*args, **kwargs):
    kwargs["weights_only"] = False
    return _original_load(*args, **kwargs)
torch.load = _safe_load

import yolov5

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
# We load it globally so it's ready for requests
print("Loading YOLOv5 model...")
try:
    model = yolov5.load('keremberke/yolov5n-license-plate')
    # set model parameters
    model.conf = 0.25  # NMS confidence threshold
    model.iou = 0.45  # NMS IoU threshold
    model.agnostic = False  # NMS class-agnostic
    model.multi_label = False  # NMS multiple labels per box
    model.max_det = 1000  # maximum number of detections per image
    print("Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")

# Serve the static files (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def read_root():
    return RedirectResponse(url="/static/index.html")

@app.post("/detect")
async def detect_license_plate(file: UploadFile = File(...)):
    try:
        # Read the image from the uploaded file
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Perform inference
        results = model(img, size=640)
        
        # Parse results
        predictions = results.pred[0]
        
        detections = []
        for pred in predictions:
            box = pred[:4].tolist() # x1, y1, x2, y2
            score = float(pred[4])
            category = int(pred[5])
            detections.append({
                "box": box,
                "score": score,
                "class": category,
                "label": model.names[category] if hasattr(model, 'names') and isinstance(model.names, dict) else "license-plate"
            })
            
        return JSONResponse(content={"detections": detections})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("Uygulamayı tarayıcıda açmak için tıklayın: http://127.0.0.1:8000")
    print("="*60 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
