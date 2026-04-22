FROM node:20-slim

# Install Chromium's system-level shared libraries.
# These must exist in the runtime layer; postinstall's --with-deps uses apt
# but Railway doesn't persist those installs across build/run layers.
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    ca-certificates \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
# postinstall runs: npx playwright install chromium --with-deps
# With the system libs already present above, --with-deps is a no-op for apt
# and the browser binary is installed into /root/.cache/ms-playwright.
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production

CMD ["npm", "start"]
