# Written by Ange Cesari
# Use official Node.js based on Alpine
FROM node:24-alpine

RUN mkdir -p /usr/src/app && chown -R node:node /usr/src/app

# Create dir for application
WORKDIR /usr/src/app

# Copy package.json
COPY --chown=node:node package.json ./

# Install dependencies
RUN yarn install --ignore-scripts

# Copy the rest of the application code
COPY --chown=node:node . .

USER node

# Expose the port the application will run on
EXPOSE 5173

# Run the application
CMD ["yarn", "dev", "--host", "0.0.0.0"]
