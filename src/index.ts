///<reference path="./types.d.ts" />

import * as os from 'os';
import * as path from 'path';
import express from 'express';
import { IncomingForm } from 'formidable';
import rimraf from 'rimraf';
import md5 from 'md5';
import { statSync } from 'fs';
import companion from '@uppy/companion';
import * as bodyParser from 'body-parser';
import session from 'express-session';
import logger from 'morgan';

import { zipToZim } from './convert';

require('dotenv').config();

const {
    GOOGLE_KEY,
    GOOGLE_SECRET,
    DROPBOX_KEY,
    DROPBOX_SECRET,
    PORT,
} = process.env;

const app = express();

app.use(logger('tiny'));

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    next();
});


app.use(bodyParser.json())
app.use(session({ secret: 'some secret' }))


app.use(express.static('public'));
app.use('node_modules', express.static('node_modules'));

const options = {
    providerOptions: {
        google: {
            key: GOOGLE_KEY,
            secret: GOOGLE_SECRET
        },
        dropbox: {
            key: DROPBOX_KEY,
            secret: DROPBOX_SECRET,
        },
    },
    server: {
        host: 'localhost:1337',
        protocol: 'http',
    },
    secret: 'test',
    filePath: path.join(os.tmpdir()),
    // debug: true,
}

app.use(companion.app(options));


const reqs: {
    [id: string]: {
        path: string,
        progress: number
    }
} = {};

async function startZipConversion(id: string, zipPath: string, zimPath: string) {
    try {
        await zipToZim(zipPath, zimPath, progress => reqs[id].progress = progress);
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
    form.maxFileSize = 100 * 1024 * 1024 * 1000;
    form.parse(req, async (err, fields, files) => {
        if (err || !files.file || !files.file.path) {
            res.status(500).send({ error: `Failed to process uploaded file` });
            return;
        }
        console.info(`Received file [${files.file.name}]`);
        const zimPath = path.join(os.tmpdir(), `${files.file.name}-${Date.now()}.zim`);
        const id = md5(zimPath);
        reqs[id] = { path: zimPath, progress: 0 };
        startZipConversion(id, files.file.path, zimPath);
        res.send({ id });
    });
});

app.get('/info/:id', (req, res) => {
    const { id } = req.params;
    const { path, progress } = (reqs[id] || {}) as any;
    if (path && fileExists(path)) {
        res.send({ complete: true, exists: true });
    } else if (path && fileExists(path.slice(0, -4) + '.tmp')) {
        res.send({ complete: false, exists: true, progress });
    } else {
        res.send({ exists: false });
    }
});

app.get('/download/:id', (req, res) => {
    const { id } = req.params;
    const { path } = reqs[id];

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

app.get('/file/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public/index.html'));
});

function fileExists(path: string) {
    let exists = false;
    try {
        exists = !!statSync(path);
    } catch (err) { }
    return exists;
}

const port = PORT || 1337;
const srv = app.listen(port, () => {
    console.info(`Listening on [${port}]`);
});

companion.socket(srv, options);
