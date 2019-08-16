# Zip2Zim

## Running

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