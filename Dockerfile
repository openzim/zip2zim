FROM kiwix/mwoffliner

RUN \
git clone https://github.com/openzim/zip2zim.git /app && \
cd /app && \
npm i

WORKDIR /app

EXPOSE 8000
CMD ["npm", "start"]