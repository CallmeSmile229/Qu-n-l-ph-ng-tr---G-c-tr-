"""Private meter display detection and OCR worker."""

import hmac
import io
import os
import re
from functools import lru_cache
from threading import BoundedSemaphore

import numpy as np
import onnxruntime as ort
import pytesseract
from flask import Flask, jsonify, request
from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 20_000_000
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 3_000_000
running = BoundedSemaphore(2)
image_types = {"image/jpeg", "image/png", "image/webp"}


@lru_cache(maxsize=1)
def detector():
    path = os.environ["YOLO_MODEL"]
    options = ort.SessionOptions()
    options.intra_op_num_threads = 2
    return ort.InferenceSession(path, sess_options=options, providers=["CPUExecutionProvider"])


def detect_display(image, model):
    """Decode the highest-scoring display box from a single-class YOLOv8/11 export."""
    model_input = model.get_inputs()[0]
    _, _, input_height, input_width = model_input.shape
    if not isinstance(input_height, int) or not isinstance(input_width, int):
        raise ValueError("Use a fixed-size ONNX export.")
    width, height = image.size
    ratio = min(input_width / width, input_height / height)
    new_width, new_height = round(width * ratio), round(height * ratio)
    left, top = (input_width - new_width) // 2, (input_height - new_height) // 2
    canvas = Image.new("RGB", (input_width, input_height), (114, 114, 114))
    canvas.paste(image.resize((new_width, new_height), Image.Resampling.BILINEAR), (left, top))
    blob = np.asarray(canvas, dtype=np.float32).transpose(2, 0, 1)[None, ...] / 255
    prediction = model.run(None, {model_input.name: blob})[0]
    if prediction.ndim != 3 or prediction.shape[:2] != (1, 5) or not prediction.shape[2]:
        raise ValueError("Expected a YOLO detection export for one display class.")
    candidates = prediction[0].T
    box = candidates[np.argmax(candidates[:, 4])]
    x, y, box_width, box_height, score = map(float, box)
    if not np.isfinite(box).all() or score < 0.4 or box_width <= 0 or box_height <= 0:
        return None
    pad_x, pad_y = 0.04 * box_width, 0.08 * box_height
    bounds = (
        max(0, int((x - box_width / 2 - pad_x - left) / ratio)),
        max(0, int((y - box_height / 2 - pad_y - top) / ratio)),
        min(width, int((x + box_width / 2 + pad_x - left) / ratio)),
        min(height, int((y + box_height / 2 + pad_y - top) / ratio)),
    )
    if bounds[2] - bounds[0] < 16 or bounds[3] - bounds[1] < 8:
        return None
    return image.crop(bounds)


def read_display(crop):
    grayscale = ImageOps.autocontrast(ImageOps.grayscale(crop))
    target_width = min(1600, max(550, grayscale.width * 3))
    height = max(1, min(450, round(grayscale.height * target_width / grayscale.width)))
    prepared = grayscale.resize((target_width, height), Image.Resampling.LANCZOS)
    prepared = prepared.filter(ImageFilter.SHARPEN)
    candidates = []
    for value in (prepared, ImageOps.invert(prepared)):
        frame = ImageOps.expand(value, border=12, fill=255)
        result = pytesseract.image_to_data(
            frame,
            lang="eng",
            config="--psm 7 -c tessedit_char_whitelist=0123456789.,",
            output_type=pytesseract.Output.DICT,
            timeout=4,
        )
        parts = [(word, float(score)) for word, score in zip(result["text"], result["conf"]) if word.strip()]
        if not parts:
            continue
        reading = "".join(word for word, _ in parts).replace(",", ".")
        confidence = min(score for _, score in parts)
        if re.fullmatch(r"\d{1,9}(?:\.\d{1,3})?", reading) and confidence >= 45:
            candidates.append((confidence, reading))
    return max(candidates)[1] if candidates else None


@app.get("/health")
def health():
    return jsonify(ready=bool(os.getenv("YOLO_MODEL") and os.getenv("OCR_TOKEN")))


@app.post("/read")
def read_meter():
    token = os.getenv("OCR_TOKEN")
    if not token or not hmac.compare_digest(request.headers.get("Authorization", ""), "Bearer " + token):
        return jsonify(error="Unauthorized"), 401
    if request.mimetype not in image_types:
        return jsonify(error="Unsupported image"), 415
    if not running.acquire(blocking=False):
        return jsonify(error="Busy"), 429
    try:
        try:
            with Image.open(io.BytesIO(request.get_data())) as source:
                if source.width * source.height > Image.MAX_IMAGE_PIXELS:
                    return jsonify(error="Image is too large"), 413
                image = ImageOps.exif_transpose(source).convert("RGB")
        except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
            return jsonify(error="Invalid image"), 422

        try:
            crop = detect_display(image, detector())
            reading = read_display(crop) if crop is not None else None
        except (OSError, KeyError, ValueError, RuntimeError, ort.capi.onnxruntime_pybind11_state.Fail):
            app.logger.warning("Meter recognition failed. Check the ONNX model and Tesseract installation.")
            return jsonify(error="Recognition unavailable"), 503
        if reading is None:
            return jsonify(error="No reliable reading"), 422
        return jsonify(reading=reading)
    finally:
        running.release()
