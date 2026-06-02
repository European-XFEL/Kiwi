FROM nginx:alpine
# Remove default NGINX configuration
RUN rm /etc/nginx/conf.d/default.conf
# Copy custom configuration from nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
