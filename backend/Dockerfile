FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# --ws-max-size 65536 (64 KiB): techo de memoria para los frames WebSocket
# entrantes. uvicorn rechaza los frames sobredimensionados en la capa de
# protocolo ANTES de materializarlos (el valor por defecto es 16 MiB). El check
# in-app de 8 KiB (MAX_MESSAGE_BYTES) es solo la segunda capa y corre después
# de `receive_text()`. Spec fix-abuse-cost-ceiling #54.
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--proxy-headers", \
     "--forwarded-allow-ips=*", \
     "--ws-max-size", "65536"]
