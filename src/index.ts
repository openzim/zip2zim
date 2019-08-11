///<reference path="./types.d.ts" />

import * as os from 'os';
import * as path from 'path';
import express from 'express';
import { IncomingForm } from 'formidable';
import rimraf from 'rimraf';
import md5 from 'md5';

import { zipToZim } from './convert';
import { statSync } from 'fs';

const app = express();

const reqs: any = {};

app.use(express.static('public'))

async function startZipConversion(id: string, zipPath: string, zimPath: string) {
    try {
        await zipToZim(zipPath, zimPath);
        console.info(`Successfully written [${zimPath}]`);
    } catch (err) {
        console.error(`Fatal error processing upload:`, err);
        rimraf.sync(zimPath);
        console.info(`Deleted ZIM file: [${zimPath}]`);
        delete reqs.id;
    } finally {
        rimraf.sync(zipPath);
        console.info(`Deleted ZIP file [${zipPath}]`);
    }

    // TODO: delete after 6 hours
}

app.post('/upload', (req, res) => {
    const form = new IncomingForm();
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !files.file.path) {
            res.status(500).send({ error: `Failed to process uploaded file` });
        }
        console.info(`Received file [${files.file.name}]`);
        const zimPath = path.join(os.tmpdir(), `${files.file.name}-${Date.now()}.zim`);
        const id = md5(zimPath);
        reqs[id] = zimPath;
        startZipConversion(id, files.file.path, zimPath);
        res.send({ id });
    });
});

app.get('/file/:id', (req, res) => {
    const { id } = req.params;
    const path = reqs[id];
    if (fileExists(path)) {
        res.send({ complete: true, exists: true });
    } else if (fileExists(path.slice(0, -4) + '.tmp')) {
        res.send({ complete: false, exists: true });
    } else {
        res.send({ exists: false });
    }
});

app.get('/download/:id', (req, res) => {
    const { id } = req.params;
    const path = reqs[id];

    if (fileExists(path)) {
        res.download(path, (err) => {
            if (!err) {
                rimraf.sync(path);
            }
        });
    } else {
        res.status(404).send({ error: 'File doesn\'t exist' });
    }
});

function fileExists(path: string) {
    let exists = false;
    try {
        exists = !!statSync(path);
    } catch (err) { }
    return exists;
}

const port = process.env.PORT || 1337;
app.listen(port, () => {
    console.info(`Listening on [${port}]`);
});