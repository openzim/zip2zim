import * as express from 'express';
import * as formidable from 'formidable';
import * as fs from 'fs';
import * as friendly from 'friendly-ids';
import * as rimraf from 'rimraf';
import * as unzip from 'unzip';
import { spawn } from 'child_process';

type PoolState = 'pending' | 'inprogress' | 'fail' | 'done';

const poolStatus: {
    [id: string]: PoolState
} = {};

const scheduleEntryDeletion = id => {
    setTimeout(_ => deletePoolEntry(id), 100000);
};

const copyFileSync = function copyFileSync(from, to) {
  fs.writeFileSync(to, fs.readFileSync(from));
};

const newPoolEntry = handler => {
    const id = friendly();

    scheduleEntryDeletion(id);

    fs.mkdir(`./pool/${id}`, function (err) {
        if (err) {
            poolStatus[id] = 'fail';
            return console.error(err);
        }
        fs.mkdir(`./pool/${id}/out`);
        poolStatus[id] = 'pending';
        handler(id);
    });
};

const deletePoolEntry = id => {
    rimraf(`./pool/${id}`, err => {
        delete poolStatus[id];
        if (err) console.error(err);
    });
};

const zimify = function zimify(id: string) {
    if (poolStatus[id] === 'pending') {
        poolStatus[id] = 'inprogress';

        const config = {
            index: 'index.html',
            favicon: 'favicon.png',
            language: 'en',
            title: 'Zip2Zim',
            name: 'Zip2Zim',
            description: 'This was made using Zip2Zim',
            creator: 'Joseph Reeve',
            publisher: 'Joseph Reeve'
        };

        try {
            const overrideConfig = JSON.parse(fs.readFileSync(`./pool/${id}/content/config.json`, 'utf8') || '{}');
            Object.assign(config, overrideConfig);
        } catch (e) { //No Override Config
            copyFileSync('./res/favicon.png', `./pool/${id}/content/favicon.png`);
        }

        console.log(config);

        try{
            fs.statSync(`./pool/${id}/content/favicon.png`);
        } catch (e) {
            
        }

        const exportProc = spawn(`zimwriterfs`,
            ['--verbose',
                `--welcome=${config.index}`,
                `--favicon=${config.favicon}`,
                `--language=${config.language}`,
                `--title=${config.title}`,
                `--name=${config.name}`,
                `--description=${config.description}`,
                `--creator=${config.creator}`,
                `--publisher=${config.publisher}`,
                `./pool/${id}/content`,
                `./pool/${id}/out/${config.title}.zim`]);

        exportProc.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
        });

        exportProc.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
        });

        exportProc.on('exit', function (code) {
            console.log('child process exited with code ' + code);
            if (code === 0) {
                poolStatus[id] = 'done';
            } else {
                poolStatus[id] = 'fail';
            }
        });
    }
}

//******** INIT ********//
fs.readdir('./pool', (err, files) => {
    files.filter(file => file !== '.gitignore').forEach(file => {
        rimraf(`./pool/${file}`, err => {
            if (err) console.error(err);
        });
    });

    //Initialize with a single item in pool
    newPoolEntry(Object);

});

const app = express();

app.use(express.static('public'));

app.get('/', function (req, res) {
    fs.createReadStream('./public/index.html').pipe(res);
});

app.post('/upload', function (req, res) {
    const form = new formidable.IncomingForm();

    newPoolEntry(id => {
        form.parse(req, function (err, fields, files) {
            if (files && files.file && files.file.path) {
                fs.createReadStream(files.file.path)
                    .pipe(unzip.Extract({ path: `./pool/${id}/content/` }))
                    .on('close', function () {
                        zimify(id);
                    });
                res.send(`success`);
            } else {
                console.error('Upload Failed');
                res.status(500).send('There was an error with the upload');
            }
        });
    });
});

app.listen(8000);