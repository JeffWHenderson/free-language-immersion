FROM node AS vite-app

COPY . .

RUN ["npm", "i"]
RUN ["npm", "run", "build"]

FROM nginx:alpine

WORKDIR /usr/share/nginx/

RUN rm -rf html
RUN mkdir html

WORKDIR /

COPY nginx.conf /etc/nginx
COPY --from=vite-app dist /usr/share/nginx/html

ENTRYPOINT ["nginx", "-g", "daemon off;"]
