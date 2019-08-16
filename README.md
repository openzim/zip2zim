# Zip2Zim
A tool for generating ZIM files from zipped HTML/CSS/JS content.

See the website for more info: [https://zip2zim.openzim.org](https://zip2zim.openzim.org)


## Running
```bash
npm install
cp .env.example .env
# Edit .env
npm run start:dev
```

### Docker
```bash
docker run \
    -e GOOGLE_KEY=XXX \
    -e GOOGLE_SECRET=XXX \
    -e DROPBOX_KEY=XXX \
    -e DROPBOX_SECRET=XXX \
    -e PORT=8080 \
    -p 8080:8080 \
    openzim:zip2zim
```

# Who
Made by [`@ISNIT0`](https://simmsreeve.com) in Stockholm 🇸🇪 at the [Kiwix 2019 Hackathon](https://wiki.kiwix.org/wiki/Hackathon_Wikimania_2019)

# License
GPLv3 - [./LICENSE](./LICENSE)