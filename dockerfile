# Written by Ange Cesari
# Use official Node.js based on Alpine
FROM node:18-alpine

# Install Yarn
RUN apk add --no-cache yarn

# Create dir for application
WORKDIR /usr/src/app

# Copy package.json
COPY package.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY . .

# Expose the port the application will run on
EXPOSE 5173

# Run the application
CMD ["yarn", "dev", "--host", "0.0.0.0"]
