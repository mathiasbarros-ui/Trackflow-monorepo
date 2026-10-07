FROM node:24-alpine

RUN apk add --no-cache bash tini
WORKDIR /workspace/uis

COPY website/package.json website/package-lock.json ./website/
RUN npm --prefix website ci --no-audit --no-fund
COPY backoffice/package.json backoffice/package-lock.json ./backoffice/
RUN npm --prefix backoffice ci --no-audit --no-fund

COPY . .

ENTRYPOINT ["/sbin/tini", "-g", "--"]
CMD ["bash", "/workspace/uis/start.sh"]