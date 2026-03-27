FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_API_URL=https://babybaton-production.up.railway.app
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
RUN npx expo export --platform web

FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/dist ./dist
ENV PORT=8080
EXPOSE $PORT
CMD ["sh", "-c", "serve -s dist -l $PORT"]
