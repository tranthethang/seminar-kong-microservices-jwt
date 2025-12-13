# Use official Node.js 22 base image (Alpine)
FROM node:22-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Install necessary build tools (build-base, python3, sqlite-dev, git)
# This is MANDATORY step to compile sqlite3 into valid .node file on Alpine Linux
RUN apk add --no-cache build-base python3 sqlite-dev git

# Copy dependencies configuration files
COPY package*.json ./

# Run npm install to install and compile sqlite3 inside container
RUN npm install --legacy-peer-deps

# Copy entire application source code into working directory
COPY . .

EXPOSE 3000

# Default command to run the application
CMD ["node", "index.js"]
