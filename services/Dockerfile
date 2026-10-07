FROM python:3.12-slim

RUN pip install --no-cache-dir uv==0.8.22
WORKDIR /workspace/services/trackflow-api

COPY trackflow-api/requirements.txt ./requirements.txt
RUN uv pip install --system --no-cache -r requirements.txt

COPY . /workspace/services/
COPY --from=shared_packages / /workspace/packages/

CMD ["python", "/workspace/services/start.py"]