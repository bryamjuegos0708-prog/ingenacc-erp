FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000 INGENACC_SEED_MODE=operational DATABASE_PATH=/app/server/data/ingenacc.db
WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/server/data && chown -R node:node /app/server/data
USER node
EXPOSE 4000
VOLUME ["/app/server/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm","start"]
