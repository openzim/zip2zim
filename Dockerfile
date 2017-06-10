FROM openzim/mwoffliner

RUN \
git clone https://github.com/openzim/zip2zim.git /app && \
cd /app && \
npm i && \
node_modules/.bin/pm2 install typescript

WORKDIR /app

EXPOSE 8000
ENTRYPOINT ["node"]
CMD ["./node_modules/.bin/pm2-docker", "index.ts"]